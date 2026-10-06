"""
Mock & Historical Candle Replay Generator.
Enables deterministic unit testing, backtesting, and live simulation
with controlled injection of volume spikes, breakouts, and divergences.
"""
from typing import List, Dict, Any, Optional
import time
import random
from deltaradar.models import Candle
from deltaradar.ingest.base import BaseFeedAdapter

class MockReplayAdapter(BaseFeedAdapter):
    def __init__(self, fallback_polling_interval: float = 1.0):
        super().__init__("MockReplay", fallback_polling_interval)
        self.candle_buffers: Dict[str, List[Candle]] = {}

    def generate_baseline_series(
        self,
        symbol: str,
        start_price: float = 100.0,
        count: int = 30,
        base_volume: float = 1000.0,
        period: str = "5m",
    ) -> List[Candle]:
        """Generates steady historical candles without anomalies."""
        now = time.time()
        candles = []
        p = start_price
        
        for i in range(count, 0, -1):
            ts = now - (i * 300)
            noise = (random.random() - 0.5) * 0.006 * p
            o = p
            c = p + noise
            h = max(o, c) + abs(random.random() * 0.003 * p)
            l = min(o, c) - abs(random.random() * 0.003 * p)
            v = base_volume * (0.8 + random.random() * 0.4)
            p = c
            
            candles.append(Candle(
                symbol=symbol,
                timestamp=ts,
                open=round(o, 4),
                high=round(h, 4),
                low=round(l, 4),
                close=round(c, 4),
                volume=round(v, 2),
                period=period,
            ))
        self.candle_buffers[symbol] = candles
        return candles

    def inject_volume_spike(self, symbol: str, multiplier: float = 4.0) -> Candle:
        """Appends a candle with a volume spike."""
        candles = self.candle_buffers.get(symbol, [])
        if not candles:
            candles = self.generate_baseline_series(symbol)
        
        last = candles[-1]
        avg_vol = sum(c.volume for c in candles[-20:]) / min(20, len(candles))
        
        spike_candle = Candle(
            symbol=symbol,
            timestamp=last.timestamp + 300,
            open=last.close,
            high=last.close * 1.015,
            low=last.close * 0.998,
            close=last.close * 1.012,
            volume=avg_vol * multiplier,
            period=last.period,
        )
        candles.append(spike_candle)
        self.candle_buffers[symbol] = candles
        return spike_candle

    def inject_breakout(self, symbol: str, direction: str = "high", penetration_pct: float = 0.8) -> Candle:
        """Appends a candle breaking out beyond the 20-period swing high or low."""
        candles = self.candle_buffers.get(symbol, [])
        if not candles:
            candles = self.generate_baseline_series(symbol)
        
        recent = candles[-20:]
        last = candles[-1]
        
        if direction == "high":
            swing_high = max(c.high for c in recent)
            target_close = swing_high * (1.0 + (penetration_pct / 100.0))
            bo_candle = Candle(
                symbol=symbol,
                timestamp=last.timestamp + 300,
                open=last.close,
                high=target_close * 1.004,
                low=last.close * 0.999,
                close=round(target_close, 4),
                volume=last.volume * 2.2,
                period=last.period,
            )
        else:
            swing_low = min(c.low for c in recent)
            target_close = swing_low * (1.0 - (penetration_pct / 100.0))
            bo_candle = Candle(
                symbol=symbol,
                timestamp=last.timestamp + 300,
                open=last.close,
                high=last.close * 1.001,
                low=target_close * 0.996,
                close=round(target_close, 4),
                volume=last.volume * 2.2,
                period=last.period,
            )
        candles.append(bo_candle)
        self.candle_buffers[symbol] = candles
        return bo_candle

    async def fetch_historical_candles(self, symbol: str, limit: int = 50, period: str = "5m") -> List[Candle]:
        if symbol not in self.candle_buffers:
            self.generate_baseline_series(symbol, count=limit, period=period)
        return self.candle_buffers[symbol][-limit:]

    async def start(self, symbols: List[str]):
        self.is_running = True

    async def stop(self):
        self.is_running = False
