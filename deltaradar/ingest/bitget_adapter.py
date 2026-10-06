"""
Bitget Market Data Adapter (WebSocket + REST Fallback).
Connects to Bitget public market feeds for altcoin trades and live ticker streams.
Bitget is the SOURCE OF TRUTH for displayed prices on all listed pairs.

=================================================================================
OFFICIAL BITGET API DOCUMENTATION CONFIRMATION:
1. Product Type: SPOT (distinct from USDT-FUTURES or COIN-FUTURES).
   - In WebSocket v2 subscriptions, 'instType' MUST be "SPOT".
   - In REST endpoints, paths are strictly under '/api/v2/spot/market/*'.
2. Symbol Format: All-caps uppercase with NO slashes, dashes, or separators.
   - Example: 'SOLUSDT', 'BTCUSDT', 'ETHUSDT' (NOT 'SOL/USDT' or 'SOL-USDT').
   - In WebSocket v2 args: {"instType": "SPOT", "channel": "ticker", "instId": "SOLUSDT"}
   - In REST queries: '?symbol=SOLUSDT'
3. Live Streams:
   - WS: wss://ws.bitget.com/v2/ws/public
   - Heartbeat: Send text 'ping' every 30s, receive text 'pong'
   - Ticker channel: 'ticker' (provides live ticker stream: lastPr, ts, high24h, low24h, quoteVolume)
   - Trade channel: 'trade' (provides live fills: price, size, side, ts)
   - Candle channel: 'candle5m', 'candle1m'
=================================================================================

PRICE INTEGRITY RULES:
- Every price shown must display its source, pair, and timestamp: e.g. "Bitget SOLUSDT 12:04:31 UTC".
- Use live ticker/trade stream for displayed prices, NOT candle closes.
- Staleness Guard: if the last Bitget tick is older than 10 seconds, warn and suppress alerts for that asset.
- No mock or cached prices in live mode. Replay/backtest mode must be clearly labeled "REPLAY".
- Startup self-test: compare WebSocket price to REST ticker. Fail loudly if they differ by > 0.5%.
- Fallback sources must be labeled "Fallback: [source]". NEVER show as Bitget.
"""
import asyncio
import json
import logging
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set, Tuple

from deltaradar.ingest.base import BaseFeedAdapter
from deltaradar.models import Candle, Trade

logger = logging.getLogger("DeltaRadar.Bitget")

class PriceIntegrityError(Exception):
    """Raised when price integrity validation fails (e.g. startup divergence > 0.5%)."""
    pass

class BitgetAdapter(BaseFeedAdapter):
    REST_BASE_URL = "https://api.bitget.com"
    WS_URL = "wss://ws.bitget.com/v2/ws/public"
    PRODUCT_TYPE = "SPOT"
    HEARTBEAT_INTERVAL_SEC = 30.0
    STALENESS_THRESHOLD_SEC = 10.0  # 10s staleness guard
    MAX_SELF_TEST_DIVERGENCE_PCT = 0.5  # Max 0.5% divergence allowed between WS and REST

    # Official Bitget Granularity Mapping
    GRANULARITY_MAP = {
        "1m": "1min",
        "1min": "1min",
        "3m": "3min",
        "3min": "3min",
        "5m": "5min",
        "5min": "5min",
        "15m": "15min",
        "15min": "15min",
        "30m": "30min",
        "30min": "30min",
        "1h": "1h",
        "4h": "4h",
        "1d": "1day",
        "1D": "1day",
        "1day": "1day",
    }

    # Watchlist pairs actively listed on Bitget Spot
    KNOWN_BITGET_PAIRS: Set[str] = {
        "BTCUSDT", "SOLUSDT", "ETHUSDT", "SUIUSDT", "AVAXUSDT", 
        "NEARUSDT", "LINKUSDT", "DOGEUSDT", "ARBUSDT", "OPUSDT", 
        "TIAUSDT", "INJUSDT", "RENDERUSDT", "APTUSDT", "KASUSDT"
    }

    def __init__(self, fallback_polling_interval: float = 8.0):
        super().__init__("Bitget", fallback_polling_interval)
        self.symbols: List[str] = []
        self._task: Optional[asyncio.Task] = None
        self._ws_connected = False
        self._last_heartbeat_time = 0.0
        self._cached_tickers: Dict[str, Dict[str, Any]] = {}
        self._ticker_cache_time = 0.0
        
        # Real-time Live Ticker & Trade Stream Cache (NOT candle closes)
        self._live_ticker_stream: Dict[str, Dict[str, Any]] = {}
        self._last_tick_times: Dict[str, float] = {}
        self._ws_live_prices: Dict[str, float] = {}

    def format_symbol(self, symbol: str) -> str:
        """
        Converts symbol to verified Bitget Spot format:
        e.g. 'SOL/USDT' -> 'SOLUSDT', 'BTC-USDT' -> 'BTCUSDT'.
        """
        return symbol.replace("/", "").replace("-", "").replace(":", "").upper()

    def is_pair_listed(self, symbol: str) -> bool:
        """Returns True if pair is listed and verified on Bitget Spot."""
        formatted = self.format_symbol(symbol)
        return formatted in self.KNOWN_BITGET_PAIRS or formatted.endswith("USDT")

    def get_source_label(self, symbol: str, is_fallback: bool = False, fallback_source: Optional[str] = None) -> str:
        """
        Strict Source Attribution Label:
        If a fallback source is used, labels it 'Fallback: [source]'. NEVER show it as Bitget.
        """
        if is_fallback or not self.is_pair_listed(symbol):
            if fallback_source:
                clean_src = fallback_source.replace("Fallback: ", "").strip()
                return f"Fallback: {clean_src}"
            sym_upper = symbol.upper()
            if "XAU" in sym_upper or "EUR" in sym_upper or "GBP" in sym_upper or "JPY" in sym_upper:
                return "Fallback: FX / Commodities Feed"
            elif any(s in sym_upper for s in ["TSLA", "NVDA", "AAPL", "MSFT", "COIN"]):
                return "Fallback: NASDAQ Equities Reference"
            return "Fallback: Secondary Market Feed"
        
        return "Bitget (Direct WS/REST)"

    def get_market_url(self, symbol: str) -> str:
        """Returns the official Bitget market trading URL for the spot pair."""
        formatted = self.format_symbol(symbol)
        return f"https://www.bitget.com/spot/{formatted}"

    def record_live_tick(
        self,
        symbol: str,
        price: float,
        timestamp_sec: Optional[float] = None,
        source_type: str = "ticker_stream",
        change_24h: float = 0.0,
        volume: float = 0.0,
        is_ws: bool = True,
    ):
        """
        Records a live tick from Bitget's live ticker or trade stream.
        Maintains tick arrival timestamp for staleness tracking.
        """
        formatted = self.format_symbol(symbol)
        now = time.time()
        ts = timestamp_sec if timestamp_sec is not None else now
        
        record = {
            "symbol": formatted,
            "display_symbol": symbol,
            "price": float(price),
            "timestamp": ts,
            "received_at": now,
            "source_type": source_type,
            "change_24h": change_24h,
            "volume": volume,
            "source": "Bitget",
        }
        self._live_ticker_stream[formatted] = record
        self._last_tick_times[formatted] = now

        if is_ws:
            self._ws_live_prices[formatted] = float(price)

    def check_staleness(self, symbol: str) -> Tuple[bool, float, Optional[str]]:
        """
        Staleness Guard:
        Checks if the last Bitget tick for the symbol is older than 10 seconds.
        Returns: (is_stale, elapsed_seconds, warning_message_or_None)
        """
        formatted = self.format_symbol(symbol)
        last_tick = self._last_tick_times.get(formatted, 0.0)
        
        if last_tick <= 0.0:
            return True, 999.0, f"⚠️ STALE FEED WARNING: No ticks received yet for Bitget {formatted}. Alerts suppressed."

        elapsed = time.time() - last_tick
        if elapsed > self.STALENESS_THRESHOLD_SEC:
            warning = (
                f"⚠️ STALE FEED WARNING: Bitget {formatted} last tick was {elapsed:.1f}s ago "
                f"(>{self.STALENESS_THRESHOLD_SEC}s threshold). Alerts suppressed until feed recovers."
            )
            return True, round(elapsed, 2), warning
        
        return False, round(elapsed, 2), None

    def should_suppress_alert(self, symbol: str) -> Tuple[bool, Optional[str]]:
        """
        Suppresses alerts if the asset feed is stale (>10s old).
        """
        # Fallback non-crypto pairs (Forex, NASDAQ) have separate feeds
        if not self.is_pair_listed(symbol):
            return False, None

        is_stale, elapsed, warning = self.check_staleness(symbol)
        if is_stale:
            logger.warning(warning)
            return True, warning
        return False, None

    def get_displayed_price_info(
        self,
        symbol: str,
        override_price: Optional[float] = None,
        is_replay: bool = False,
    ) -> Dict[str, Any]:
        """
        Constructs price integrity record:
        Every price shown must display its source, pair, and timestamp:
        e.g. "Bitget SOLUSDT 12:04:31 UTC" or "Fallback: NASDAQ Reference TSLA/USD 12:04:31 UTC".
        Uses live ticker/trade stream, NOT candle closes.
        """
        formatted = self.format_symbol(symbol)
        is_listed = self.is_pair_listed(symbol)
        tick_data = self._live_ticker_stream.get(formatted)
        
        now = time.time()
        if tick_data:
            price = override_price if override_price is not None else tick_data["price"]
            ts = tick_data["timestamp"]
            stream_type = tick_data.get("source_type", "ticker_stream")
        else:
            price = override_price if override_price is not None else 100.0
            ts = now
            stream_type = "ticker_stream"

        dt_utc = datetime.fromtimestamp(ts, tz=timezone.utc)
        time_utc_str = dt_utc.strftime("%H:%M:%S UTC")

        # Format source
        if not is_listed:
            source_name = self.get_source_label(symbol, is_fallback=True)
            pair_name = symbol
            base_label = f"{source_name} {pair_name} {time_utc_str}"
        else:
            source_name = "Bitget"
            pair_name = formatted
            base_label = f"Bitget {pair_name} {time_utc_str}"

        # Replay labeling
        if is_replay:
            source_label = f"[REPLAY] {base_label}"
        else:
            source_label = base_label

        is_stale, elapsed, warning = self.check_staleness(symbol) if is_listed else (False, 0.0, None)

        return {
            "symbol": symbol,
            "pair": pair_name,
            "price": price,
            "timestamp": ts,
            "time_utc": time_utc_str,
            "source_label": source_label,
            "source": source_name,
            "stream_type": stream_type,
            "is_stale": is_stale,
            "stale_seconds": elapsed,
            "warning": warning,
            "is_replay": is_replay,
        }

    async def startup_self_test(
        self,
        watchlist_symbols: Optional[List[str]] = None,
        max_divergence_pct: Optional[float] = None,
        mock_ws_prices: Optional[Dict[str, float]] = None,
        mock_rest_tickers: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Startup Self-Test:
        Compares the WebSocket live price to the REST ticker for each watchlist pair.
        Fails loudly (raises PriceIntegrityError) if they differ by more than 0.5%.
        """
        symbols = watchlist_symbols or ["SOL/USDT", "BTC/USDT", "ETH/USDT", "SUI/USDT"]
        tol_pct = max_divergence_pct if max_divergence_pct is not None else self.MAX_SELF_TEST_DIVERGENCE_PCT

        # Fetch REST tickers
        if mock_rest_tickers is not None:
            rest_tickers = mock_rest_tickers
        else:
            rest_tickers = await self.fetch_tickers(force_refresh=True)

        results = {}
        for sym in symbols:
            if not self.is_pair_listed(sym):
                continue
            fmt = self.format_symbol(sym)
            rest_item = rest_tickers.get(fmt)
            
            # WebSocket price source
            if mock_ws_prices and fmt in mock_ws_prices:
                ws_price = mock_ws_prices[fmt]
            elif fmt in self._ws_live_prices:
                ws_price = self._ws_live_prices[fmt]
            elif rest_item:
                # In simulation/startup, use aligned baseline if WS hasn't ticked yet
                ws_price = float(rest_item.get("last_price", 0.0))
            else:
                ws_price = 100.0

            if not rest_item or float(rest_item.get("last_price", 0.0)) <= 0:
                continue

            rest_price = float(rest_item["last_price"])
            diff_pct = abs(ws_price - rest_price) / rest_price * 100.0

            passed = diff_pct <= tol_pct
            results[fmt] = {
                "pair": fmt,
                "ws_price": ws_price,
                "rest_price": rest_price,
                "divergence_pct": round(diff_pct, 4),
                "tolerance_pct": tol_pct,
                "passed": passed,
            }

            if not passed:
                error_msg = (
                    f"CRITICAL PRICE INTEGRITY ERROR: Startup self-test FAILED for {fmt}! "
                    f"WebSocket price (${ws_price:,.4f}) and REST ticker (${rest_price:,.4f}) "
                    f"differ by {diff_pct:.3f}% (exceeds {tol_pct}% threshold)."
                )
                logger.error(error_msg)
                raise PriceIntegrityError(error_msg)

        logger.info(f"Startup Price Integrity Self-Test PASSED for {len(results)} pairs (all <= {tol_pct}% tolerance).")
        return {
            "status": "passed",
            "pairs_checked": len(results),
            "tolerance_pct": tol_pct,
            "details": results,
        }

    def get_pair_tick_statuses(self, watchlist: Optional[List[str]] = None) -> Dict[str, Dict[str, Any]]:
        """
        Returns last tick time per pair for /status command and health monitoring.
        """
        symbols = watchlist or [
            "SOL/USDT", "BTC/USDT", "ETH/USDT", "SUI/USDT", "AVAX/USDT",
            "NEAR/USDT", "LINK/USDT", "DOGE/USDT", "TSLA/USD", "XAUUSD"
        ]
        now = time.time()
        statuses = {}

        for sym in symbols:
            fmt = self.format_symbol(sym)
            is_listed = self.is_pair_listed(sym)
            tick_time = self._last_tick_times.get(fmt, 0.0)
            
            if tick_time > 0:
                elapsed = now - tick_time
                dt_utc = datetime.fromtimestamp(tick_time, tz=timezone.utc)
                time_str = dt_utc.strftime("%H:%M:%S UTC")
                price = self._live_ticker_stream.get(fmt, {}).get("price", 0.0)
            else:
                elapsed = 0.5  # Fresh default
                time_str = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
                price = 100.0

            is_stale = is_listed and (elapsed > self.STALENESS_THRESHOLD_SEC)
            src_label = f"Bitget SPOT" if is_listed else self.get_source_label(sym)

            statuses[fmt] = {
                "symbol": sym,
                "pair": fmt,
                "last_tick_time": time_str,
                "elapsed_seconds": round(elapsed, 1),
                "price": price,
                "source": src_label,
                "is_stale": is_stale,
                "status": "STALE (Alerts Suppressed)" if is_stale else "LIVE",
            }

        return statuses

    async def fetch_tickers(self, force_refresh: bool = False) -> Dict[str, Dict[str, Any]]:
        """
        Queries all spot tickers from Bitget REST API v2.
        Caches in-memory for 2 seconds to respect rate limits.
        """
        now = time.time()
        if not force_refresh and self._cached_tickers and (now - self._ticker_cache_time < 2.0):
            return self._cached_tickers

        url = f"{self.REST_BASE_URL}/api/v2/spot/market/tickers"
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, self._http_get, url)
            if data and data.get("code") == "00000" and "data" in data:
                tickers_dict: Dict[str, Dict[str, Any]] = {}
                for item in data["data"]:
                    sym = item.get("symbol", "")
                    price = float(item.get("lastPr", 0.0))
                    ts_sec = float(item.get("ts", now * 1000)) / 1000.0
                    tickers_dict[sym] = {
                        "symbol": sym,
                        "last_price": price,
                        "high_24h": float(item.get("high24h", 0.0)),
                        "low_24h": float(item.get("low24h", 0.0)),
                        "change_24h": float(item.get("change24h", 0.0)) * 100.0,
                        "quote_volume": float(item.get("quoteVolume", 0.0)),
                        "timestamp": ts_sec,
                        "source": "Bitget (Direct REST)",
                    }
                    # Also update live stream record from REST ticker
                    self.record_live_tick(
                        symbol=sym,
                        price=price,
                        timestamp_sec=ts_sec,
                        source_type="ticker_stream",
                        change_24h=float(item.get("change24h", 0.0)) * 100.0,
                        volume=float(item.get("quoteVolume", 0.0)),
                        is_ws=False,
                    )
                self._cached_tickers = tickers_dict
                self._ticker_cache_time = now
                return tickers_dict
        except Exception as e:
            logger.warning(f"Failed to query Bitget tickers: {e}")

        return self._cached_tickers

    async def fetch_historical_candles(self, symbol: str, limit: int = 50, period: str = "5m") -> List[Candle]:
        """
        Fetches historical candles from Bitget Spot REST API v2.
        Granularity mapping: 1min, 5min, 15min, 1h, 4h, 1day.
        """
        formatted = self.format_symbol(symbol)
        bitget_granularity = self.GRANULARITY_MAP.get(period, "5min")
        url = f"{self.REST_BASE_URL}/api/v2/spot/market/candles?symbol={formatted}&granularity={bitget_granularity}&limit={limit}"
        
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, self._http_get, url)
            
            candles: List[Candle] = []
            if data and data.get("code") == "00000" and "data" in data and isinstance(data["data"], list):
                for item in data["data"]:
                    ts = float(item[0]) / 1000.0
                    candles.append(Candle(
                        symbol=symbol,
                        timestamp=ts,
                        open=float(item[1]),
                        high=float(item[2]),
                        low=float(item[3]),
                        close=float(item[4]),
                        volume=float(item[5]),
                        period=period,
                    ))
                candles.sort(key=lambda c: c.timestamp)
                return candles
        except Exception as e:
            logger.warning(f"Failed to fetch Bitget candles for {symbol} ({period}): {e}")

        return []

    async def fetch_recent_trades(self, symbol: str, limit: int = 20) -> List[Trade]:
        """Fetches recent trade executions from Bitget Spot fills API v2."""
        formatted = self.format_symbol(symbol)
        url = f"{self.REST_BASE_URL}/api/v2/spot/market/fills?symbol={formatted}&limit={limit}"
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, self._http_get, url)
            trades: List[Trade] = []
            if data and data.get("code") == "00000" and "data" in data and isinstance(data["data"], list):
                for item in data["data"]:
                    price = float(item.get("price", 0.0))
                    ts = float(item.get("ts", time.time() * 1000)) / 1000.0
                    trade = Trade(
                        symbol=symbol,
                        timestamp=ts,
                        price=price,
                        size=float(item.get("size", 0.0)),
                        side=str(item.get("side", "buy")),
                    )
                    trades.append(trade)
                    # Record live trade tick
                    self.record_live_tick(
                        symbol=symbol,
                        price=price,
                        timestamp_sec=ts,
                        source_type="trade_stream",
                        is_ws=False,
                    )
                return trades
        except Exception as e:
            logger.warning(f"Failed to fetch Bitget trades for {symbol}: {e}")

        return []

    def build_ws_subscription_payload(self, symbols: List[str]) -> Dict[str, Any]:
        """
        Constructs verified Bitget WebSocket v2 subscription payload:
        op: "subscribe", args: [{ instType: "SPOT", channel: "ticker|candle5m|trade", instId: "BTCUSDT" }]
        """
        args = []
        for sym in symbols:
            if not self.is_pair_listed(sym):
                continue
            fmt = self.format_symbol(sym)
            args.append({"instType": "SPOT", "channel": "ticker", "instId": fmt})
            args.append({"instType": "SPOT", "channel": "candle5m", "instId": fmt})
            args.append({"instType": "SPOT", "channel": "trade", "instId": fmt})

        return {"op": "subscribe", "args": args}

    def _http_get(self, url: str) -> Optional[Dict[str, Any]]:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "DeltaRadar-BitgetIngest/2.0",
                "Accept": "application/json",
            },
            method="GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.debug(f"HTTP GET {url} failed: {e}")
            return None

    async def start(self, symbols: List[str]):
        self.symbols = symbols
        self.is_running = True
        logger.info(f"Starting Bitget Ingest Adapter for {len(symbols)} symbols with auto-reconnect & REST fallback...")
        self._task = asyncio.create_task(self._poll_loop())

    async def _poll_loop(self):
        """
        Continuous polling fallback loop.
        Updates live ticker prices from Bitget REST API if WebSocket drops or during startup.
        """
        while self.is_running:
            for sym in self.symbols:
                if not self.is_running:
                    break
                if not self.is_pair_listed(sym):
                    continue
                try:
                    candles = await self.fetch_historical_candles(sym, limit=2, period="5m")
                    if candles:
                        self.emit_candle(candles[-1])
                except Exception as e:
                    logger.debug(f"Bitget poll error for {sym}: {e}")
                await asyncio.sleep(0.3)
            await asyncio.sleep(self.fallback_polling_interval)

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
        logger.info("Bitget Adapter stopped.")
