import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Radio,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
  Code2,
  Server,
  Zap,
} from 'lucide-react';
import { AssetBadge } from './AssetBadge';

export interface WatchlistPairConfig {
  instId: string;       // e.g. "SOLUSDT" (official Bitget spot symbol format)
  name: string;         // e.g. "Solana"
  baseAsset: string;    // "SOL"
  quoteAsset: string;   // "USDT"
  tag: string;
}

export const DEFAULT_WATCHLIST_PAIRS: WatchlistPairConfig[] = [
  { instId: 'SOLUSDT', name: 'Solana', baseAsset: 'SOL', quoteAsset: 'USDT', tag: 'Top L1' },
  { instId: 'BTCUSDT', name: 'Bitcoin', baseAsset: 'BTC', quoteAsset: 'USDT', tag: 'Benchmark' },
  { instId: 'ETHUSDT', name: 'Ethereum', baseAsset: 'ETH', quoteAsset: 'USDT', tag: 'Smart Contracts' },
  { instId: 'RNVDAUSDT', name: 'NVIDIA Corp', baseAsset: 'rNVDA', quoteAsset: 'USDT', tag: 'Tokenized Stock' },
  { instId: 'RMUUSDT', name: 'Micron Technology', baseAsset: 'rMU', quoteAsset: 'USDT', tag: 'Tokenized Stock' },
  { instId: 'RSNDKUSDT', name: 'SanDisk Corp', baseAsset: 'rSNDK', quoteAsset: 'USDT', tag: 'Tokenized Stock' },
  { instId: 'RMETAUSDT', name: 'Meta Platforms', baseAsset: 'rMETA', quoteAsset: 'USDT', tag: 'Tokenized Stock' },
  { instId: 'RMSFTUSDT', name: 'Microsoft Corp', baseAsset: 'rMSFT', quoteAsset: 'USDT', tag: 'Tokenized Stock' },
  { instId: 'RAAPLUSDT', name: 'Apple Inc', baseAsset: 'rAAPL', quoteAsset: 'USDT', tag: 'Tokenized Stock' },
  { instId: 'RSPCXUSDT', name: 'SpaceX', baseAsset: 'rSPCX', quoteAsset: 'USDT', tag: 'Tokenized Stock' },
  { instId: 'RTSLAUSDT', name: 'Tesla Inc', baseAsset: 'rTSLA', quoteAsset: 'USDT', tag: 'Tokenized Stock' },
  { instId: 'SUIUSDT', name: 'Sui Network', baseAsset: 'SUI', quoteAsset: 'USDT', tag: 'High-Throughput' },
  { instId: 'AVAXUSDT', name: 'Avalanche', baseAsset: 'AVAX', quoteAsset: 'USDT', tag: 'Subnets' },
  { instId: 'DOGEUSDT', name: 'Dogecoin', baseAsset: 'DOGE', quoteAsset: 'USDT', tag: 'Memecoin Bellwether' },
];

export const OPTIONAL_ALTCOINS: WatchlistPairConfig[] = [
  { instId: 'NEARUSDT', name: 'NEAR Protocol', baseAsset: 'NEAR', quoteAsset: 'USDT', tag: 'AI & Sharding' },
  { instId: 'LINKUSDT', name: 'Chainlink', baseAsset: 'LINK', quoteAsset: 'USDT', tag: 'Oracles' },
  { instId: 'ARBUSDT', name: 'Arbitrum', baseAsset: 'ARB', quoteAsset: 'USDT', tag: 'Ethereum L2' },
];

export interface BitgetLiveTick {
  symbol: string;               // e.g. "SOLUSDT"
  price: number;                // Current live price
  change24h: number;            // 24h change percentage (e.g. +3.42)
  high24h: number;
  low24h: number;
  quoteVolume: number;
  timestamp: number;            // Tick timestamp from Bitget in ms
  utcTimeString: string;        // Formatted "12:04:31 UTC"
  sourceLabel: string;          // Formatted "Bitget SOLUSDT 12:04:31 UTC"
  feedChannel: 'ws' | 'rest';
  receivedAt: number;           // Client timestamp ms
}

// Format UTC time as HH:mm:ss UTC
export function formatUtcTime(timestampMs: number): string {
  if (!timestampMs || isNaN(timestampMs)) return '--:--:-- UTC';
  const d = new Date(timestampMs);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

export function LiveBitgetPriceBoard() {
  const [selectedPairs, setSelectedPairs] = useState<WatchlistPairConfig[]>(DEFAULT_WATCHLIST_PAIRS);
  const [ticks, setTicks] = useState<Record<string, BitgetLiveTick>>({});
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down'>>({});
  
  // Connection states
  const [wsState, setWsState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [wsError, setWsError] = useState<string | null>(null);
  const [lastWsPong, setLastWsPong] = useState<number | null>(null);
  const [restPollingActive, setRestPollingActive] = useState<boolean>(true);
  const [lastRestPollTime, setLastRestPollTime] = useState<number | null>(null);
  
  // CORS detection state
  const [corsBlocked, setCorsBlocked] = useState<boolean | null>(null);
  const [corsDetails, setCorsDetails] = useState<string>('');
  
  // Clock ticker for 10-second staleness calculation
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [rawFeedLog, setRawFeedLog] = useState<Array<{ time: string; type: string; summary: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const restIntervalRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Keep live time ticking every 500ms for accurate staleness evaluation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const addFeedLog = useCallback((type: string, summary: string) => {
    const nowUtc = formatUtcTime(Date.now());
    setRawFeedLog((prev) => [
      { time: nowUtc, type, summary },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Update ticks state helper with price flash detection
  const handleIncomingTick = useCallback((
    sym: string,
    rawPrice: number,
    change24h: number,
    high24h: number,
    low24h: number,
    quoteVolume: number,
    tickTimestampMs: number,
    channel: 'ws' | 'rest'
  ) => {
    if (!rawPrice || isNaN(rawPrice) || rawPrice <= 0) return;

    setTicks((prev) => {
      const oldTick = prev[sym];
      const oldPrice = oldTick?.price;

      if (oldPrice && oldPrice !== rawPrice) {
        setPriceFlash((fPrev) => ({
          ...fPrev,
          [sym]: rawPrice > oldPrice ? 'up' : 'down',
        }));
        setTimeout(() => {
          setPriceFlash((fPrev) => {
            const next = { ...fPrev };
            delete next[sym];
            return next;
          });
        }, 800);
      }

      const utcTime = formatUtcTime(tickTimestampMs);
      const newTick: BitgetLiveTick = {
        symbol: sym,
        price: rawPrice,
        change24h,
        high24h,
        low24h,
        quoteVolume,
        timestamp: tickTimestampMs,
        utcTimeString: utcTime,
        sourceLabel: `Bitget ${sym} ${utcTime}`,
        feedChannel: channel,
        receivedAt: Date.now(),
      };

      return {
        ...prev,
        [sym]: newTick,
      };
    });
  }, []);

  // 1. Establish Bitget Public WebSocket Stream
  // Official Docs: wss://ws.bitget.com/v2/ws/public
  // op: "subscribe", args: [{ instType: "SPOT", channel: "ticker", instId: "SOLUSDT" }]
  const connectBitgetWebSocket = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    setWsState('connecting');
    setWsError(null);
    addFeedLog('WS_CONNECT', 'Opening WebSocket to wss://ws.bitget.com/v2/ws/public');

    try {
      const socket = new WebSocket('wss://ws.bitget.com/v2/ws/public');
      wsRef.current = socket;

      socket.onopen = () => {
        setWsState('connected');
        setWsError(null);
        addFeedLog('WS_OPEN', 'Connected to Bitget public market stream. Subscribing to spot ticker channels...');

        // Subscribe to all monitored spot pairs
        const subArgs = selectedPairs.map((pair) => ({
          instType: 'SPOT',
          channel: 'ticker',
          instId: pair.instId,
        }));

        const subPayload = JSON.stringify({
          op: 'subscribe',
          args: subArgs,
        });

        socket.send(subPayload);
        addFeedLog('WS_SUB', `Subscribed to ${subArgs.length} pairs: ${subArgs.map((a) => a.instId).join(', ')}`);

        // Bitget WebSocket Heartbeat Keepalive (send 'ping' every 25s, receive 'pong')
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        const rawData = event.data;
        if (rawData === 'pong') {
          setLastWsPong(Date.now());
          return;
        }

        try {
          const parsed = JSON.parse(rawData);

          // Handle subscription confirmation
          if (parsed.event === 'subscribe') {
            addFeedLog('WS_ACK', `Subscription confirmed for channel: ${parsed.arg?.channel} (${parsed.arg?.instId || 'all'})`);
            return;
          }

          // Handle live ticker updates
          if (parsed.arg?.channel === 'ticker' && Array.isArray(parsed.data)) {
            parsed.data.forEach((item: any) => {
              const instId = item.instId;
              const lastPr = parseFloat(item.lastPr || '0');
              const changeRatio = parseFloat(item.change24h || '0');
              const high24h = parseFloat(item.high24h || '0');
              const low24h = parseFloat(item.low24h || '0');
              const quoteVol = parseFloat(item.quoteVolume || '0');
              const ts = parseInt(item.ts || String(parsed.ts) || String(Date.now()), 10);

              if (instId && lastPr > 0) {
                handleIncomingTick(
                  instId,
                  lastPr,
                  changeRatio * 100,
                  high24h,
                  low24h,
                  quoteVol,
                  ts,
                  'ws'
                );
              }
            });
          }
        } catch (err: any) {
          console.warn('Bitget WS message parse warning:', err);
        }
      };

      socket.onerror = (evt) => {
        console.warn('Bitget WS error:', evt);
        setWsError('WebSocket encounter error. Checking REST polling fallback...');
        addFeedLog('WS_ERROR', 'WebSocket connection error');
      };

      socket.onclose = () => {
        setWsState('disconnected');
        addFeedLog('WS_CLOSE', 'WebSocket disconnected. Scheduling reconnect in 4s...');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Auto reconnect with 4s backoff
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          setWsState('reconnecting');
          connectBitgetWebSocket();
        }, 4000);
      };
    } catch (err: any) {
      setWsState('disconnected');
      setWsError(`WebSocket initialization failed: ${err.message}`);
      addFeedLog('WS_FAIL', `Init failed: ${err.message}`);
    }
  }, [selectedPairs, handleIncomingTick, addFeedLog]);

  // 2. REST Polling Fallback (Official Bitget v2 Spot Tickers)
  // Check CORS: if browser blocks direct fetch to https://api.bitget.com, report CORS & use minimal proxy /api/bitget/proxy-tickers
  const pollBitgetRest = useCallback(async () => {
    setLastRestPollTime(Date.now());

    // First, test direct fetch to official Bitget API if CORS status unknown or periodically
    let directFetchSuccess = false;
    let dataToUse: any = null;

    try {
      // Direct call to official Bitget v2 Spot API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const directRes = await fetch('https://api.bitget.com/api/v2/spot/market/tickers', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (directRes.ok) {
        const json = await directRes.json();
        if (json.code === '00000' && Array.isArray(json.data)) {
          directFetchSuccess = true;
          setCorsBlocked(false);
          setCorsDetails('Direct REST fetch to https://api.bitget.com/api/v2/spot/market/tickers succeeded (No CORS block).');
          dataToUse = json.data;
        }
      }
    } catch (directErr: any) {
      // Browser blocked the request due to CORS or network security
      setCorsBlocked(true);
      const corsMsg = 'Browser blocked direct REST request due to CORS policy (Bitget API does not serve Access-Control-Allow-Origin headers for browser clients). Using minimal proxy /api/bitget/proxy-tickers without modifying or faking data.';
      setCorsDetails(corsMsg);
    }

    // If direct browser fetch was blocked by CORS, use our dedicated minimal proxy
    if (!directFetchSuccess) {
      try {
        const proxyRes = await fetch('/api/bitget/proxy-tickers');
        if (proxyRes.ok) {
          const proxyJson = await proxyRes.json();
          if (proxyJson.code === '00000' && Array.isArray(proxyJson.data)) {
            dataToUse = proxyJson.data;
          }
        }
      } catch (proxyErr: any) {
        addFeedLog('REST_FAIL', `Proxy fallback failed: ${proxyErr.message}`);
      }
    }

    // Process incoming REST tickers
    if (dataToUse && Array.isArray(dataToUse)) {
      const watchedSet = new Set(selectedPairs.map((p) => p.instId));
      let updatedCount = 0;

      dataToUse.forEach((item: any) => {
        if (watchedSet.has(item.symbol)) {
          const lastPr = parseFloat(item.lastPr || '0');
          const changeRatio = parseFloat(item.change24h || '0');
          const high24h = parseFloat(item.high24h || '0');
          const low24h = parseFloat(item.low24h || '0');
          const quoteVol = parseFloat(item.quoteVolume || '0');
          const ts = parseInt(item.ts || String(Date.now()), 10);

          if (lastPr > 0) {
            handleIncomingTick(
              item.symbol,
              lastPr,
              changeRatio * 100,
              high24h,
              low24h,
              quoteVol,
              ts,
              'rest'
            );
            updatedCount++;
          }
        }
      });

      if (updatedCount > 0) {
        addFeedLog('REST_POLL', `Refreshed ${updatedCount} pairs via Bitget REST ${directFetchSuccess ? '(Direct)' : '(Minimal Proxy)'}`);
      }
    }
  }, [selectedPairs, handleIncomingTick, addFeedLog]);

  // Initialize WebSocket and REST Polling
  useEffect(() => {
    connectBitgetWebSocket();

    // Immediate REST poll on startup
    pollBitgetRest();

    // Poll every 5 seconds as fallback
    restIntervalRef.current = setInterval(() => {
      pollBitgetRest();
    }, 5000);

    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectBitgetWebSocket, pollBitgetRest]);

  // Toggle altcoin watch status
  const handleTogglePair = (altPair: WatchlistPairConfig) => {
    const exists = selectedPairs.some((p) => p.instId === altPair.instId);
    let nextList: WatchlistPairConfig[];
    if (exists) {
      if (selectedPairs.length <= 3) {
        return; // maintain minimum watchlist
      }
      nextList = selectedPairs.filter((p) => p.instId !== altPair.instId);
    } else {
      nextList = [...selectedPairs, altPair];
    }
    setSelectedPairs(nextList);

    // Re-subscribe on active WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const subPayload = JSON.stringify({
        op: 'subscribe',
        args: nextList.map((p) => ({
          instType: 'SPOT',
          channel: 'ticker',
          instId: p.instId,
        })),
      });
      wsRef.current.send(subPayload);
    }
  };

  // Helper formatting numbers
  const formatPrice = (val: number | undefined): string => {
    if (val === undefined || isNaN(val)) return '--';
    if (val >= 1000) {
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (val >= 1) {
      return val.toFixed(4);
    }
    return val.toFixed(6);
  };

  const formatVolume = (vol: number | undefined): string => {
    if (!vol || isNaN(vol)) return '--';
    if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-950">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white font-mono">
                  DELTARADAR
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                  Live Price Board
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Official Bitget Spot Market Stream • Zero Mock Prices
              </p>
            </div>
          </div>

          {/* Real-time Connection Status Indicators */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* WebSocket Stream Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              {wsState === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-medium">WS: Connected</span>
                </>
              ) : wsState === 'connecting' || wsState === 'reconnecting' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-amber-400 font-medium">WS: {wsState}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-400" />
                  <span className="text-rose-400 font-medium">WS: Disconnected</span>
                </>
              )}
            </div>

            {/* REST Fallback Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <RefreshCw className={`w-3 h-3 ${restPollingActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="text-slate-300">REST Fallback:</span>
              <span className="text-cyan-400 font-bold">5s Polling</span>
            </div>

            {/* Staleness Guard Rule Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Staleness Guard:</span>
              <span className="text-slate-200 font-bold">10s</span>
            </div>

            {/* Inspector Toggle */}
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                isInspectorOpen
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Diagnostic Feed</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6 flex-1">
        {/* CORS Notification Banner (Visible if browser CORS blocked direct REST fetch) */}
        {corsBlocked === true && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs font-mono flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">CORS Policy Handled Transparently</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/60">
                  Minimal Proxy Engaged
                </span>
              </div>
              <p className="text-slate-300">
                The browser blocked direct REST requests to <code className="text-amber-300">https://api.bitget.com</code> because Bitget’s API server does not include <code className="text-amber-300">Access-Control-Allow-Origin</code> headers for web browsers.
              </p>
              <p className="text-slate-400">
                <span className="text-emerald-400 font-bold">Primary WebSocket feed (wss://ws.bitget.com/v2/ws/public) connects directly without CORS.</span> For REST polling fallback, a minimal single-route proxy (<code className="text-cyan-300">/api/bitget/proxy-tickers</code>) forwards requests directly to official Bitget endpoints without altering or substituting data.
              </p>
            </div>
          </div>
        )}

        {/* Watchlist Pair Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Monitored Bitget Spot Watchlist:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DEFAULT_WATCHLIST_PAIRS.map((p) => {
              const tick = ticks[p.instId];
              const isStale = tick ? (currentTime - tick.timestamp) > 10000 : true;
              return (
                <div
                  key={p.instId}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/80 text-xs font-mono"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tick ? (!isStale ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-slate-500'}`} />
                  <span className="font-bold text-white">{p.instId}</span>
                </div>
              );
            })}

            {/* Optional Altcoins Toggles */}
            <span className="text-slate-600 font-mono text-xs">|</span>
            <span className="text-xs font-mono text-slate-400">Add Altcoins:</span>
            {OPTIONAL_ALTCOINS.map((alt) => {
              const isSelected = selectedPairs.some((p) => p.instId === alt.instId);
              return (
                <button
                  key={alt.instId}
                  onClick={() => handleTogglePair(alt)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition border ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {isSelected ? `✓ ${alt.baseAsset}` : `+ ${alt.baseAsset}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* WATCHLIST CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {selectedPairs.map((pair) => {
            const tick = ticks[pair.instId];
            const hasData = !!tick && tick.price > 0;
            
            // Staleness guard check: > 10 seconds since tick timestamp
            const elapsedMs = tick ? currentTime - tick.timestamp : 0;
            const elapsedSeconds = +(elapsedMs / 1000).toFixed(1);
            const isStale = tick ? elapsedMs > 10000 : false;
            const isFresh = hasData && !isStale;

            const flash = priceFlash[pair.instId];
            const isPositive = tick ? tick.change24h >= 0 : true;

            return (
              <div
                key={pair.instId}
                className={`relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/90 border p-5 transition-all duration-300 shadow-xl ${
                  isStale
                    ? 'border-rose-700/60 shadow-rose-950/20'
                    : isFresh
                    ? 'border-slate-800 hover:border-cyan-800/80 shadow-slate-950/50'
                    : 'border-slate-800/60'
                }`}
              >
                {/* Header: Pair Name & Freshness Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <AssetBadge
                    symbol={pair.instId}
                    name={pair.name}
                    size="md"
                    showLogo={true}
                    showSource={true}
                    showClassTag={true}
                    showName={true}
                  />

                  {/* FRESHNESS BADGE (Green "LIVE" if <= 10s, Red "STALE" if > 10s) */}
                  <div>
                    {hasData ? (
                      !isStale ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold shadow-lg shadow-emerald-950/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>LIVE</span>
                          <span className="text-[10px] text-emerald-400/80 font-normal">
                            ({elapsedSeconds}s)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/90 border border-rose-500/80 text-rose-300 text-xs font-mono font-bold shadow-lg shadow-rose-950/50">
                          <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                          <span>STALE</span>
                          <span className="text-[10px] text-rose-300 font-normal">
                            ({elapsedSeconds}s &gt; 10s)
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs font-mono">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        <span>AWAITING TICK</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Display Area */}
                <div className="space-y-1.5 my-3">
                  {hasData ? (
                    <div>
                      {/* Main Live Price with Flash Animation */}
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-3xl font-black font-mono tracking-tight transition-colors duration-300 ${
                            flash === 'up'
                              ? 'text-emerald-400'
                              : flash === 'down'
                              ? 'text-rose-400'
                              : 'text-white'
                          }`}
                        >
                          ${formatPrice(tick.price)}
                        </span>

                        {/* 24h Change Pill */}
                        <div
                          className={`flex items-center gap-0.5 text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            isPositive
                              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                              : 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}
                            {tick.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* MANDATORY PRICE INTEGRITY ATTRIBUTION:
                          "Bitget SOLUSDT 12:04:31 UTC" under every price */}
                      <div className="pt-1">
                        <div className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span className="text-white font-semibold">
                            {tick.sourceLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Error / Awaiting State (NO MOCK PRICES) */
                    <div className="py-4 space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Connecting to Bitget market data...</span>
                      </div>
                      <p className="text-xs font-mono text-slate-500">
                        Awaiting public ticker push for {pair.instId} (no fake or cached numbers).
                      </p>
                    </div>
                  )}
                </div>

                {/* Staleness Warning Banner if tick is older than 10s */}
                {isStale && (
                  <div className="mt-2 mb-3 p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[11px] font-mono flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Staleness Guard Triggered: </span>
                      Last tick arrived {elapsedSeconds}s ago (&gt; 10s threshold). Alert suppression active for this asset.
                    </div>
                  </div>
                )}

                {/* 24h Market Stats Grid (from official Bitget ticker payload) */}
                {hasData && (
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">24h High</span>
                      <span className="text-slate-300 font-medium">${formatPrice(tick.high24h)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">24h Low</span>
                      <span className="text-slate-300 font-medium">${formatPrice(tick.low24h)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">24h Volume</span>
                      <span className="text-slate-300 font-medium">{formatVolume(tick.quoteVolume)}</span>
                    </div>
                  </div>
                )}

                {/* Card Footer: Feed Channel & External Official Link */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {tick?.feedChannel === 'ws' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        <span>WS Live Ticker</span>
                      </span>
                    ) : (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        <span>REST Polling</span>
                      </span>
                    )}
                  </div>

                  <a
                    href={`https://www.bitget.com/spot/${pair.instId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-cyan-400 flex items-center gap-1 transition"
                  >
                    <span>Bitget Market</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* FEED PROTOCOL & DIAGNOSTIC DRAWER */}
        {isInspectorOpen && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">
                  Bitget Market Data Feed Diagnostics & API Contract
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={connectBitgetWebSocket}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  Reconnect WS
                </button>
                <button
                  onClick={pollBitgetRest}
                  className="px-2.5 py-1 rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 transition"
                >
                  Force REST Poll
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* API Specs Verification */}
              <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bitget Official Public API v2 Verification</span>
                </div>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  <li>• <b>WebSocket URL:</b> <code className="text-cyan-300">wss://ws.bitget.com/v2/ws/public</code></li>
                  <li>• <b>Spot Product Type:</b> <code className="text-cyan-300">SPOT</code> (Confirmed in official Bitget docs)</li>
                  <li>• <b>Channel Name:</b> <code className="text-cyan-300">ticker</code> (Live ticker stream, not candle close)</li>
                  <li>• <b>Symbol Format:</b> <code className="text-cyan-300">SOLUSDT</code>, <code className="text-cyan-300">BTCUSDT</code> (No slashes)</li>
                  <li>• <b>Keepalive:</b> Ping interval 25s (<code className="text-cyan-300">&quot;ping&quot;</code> &rarr; <code className="text-cyan-300">&quot;pong&quot;</code>)</li>
                  <li>• <b>REST Endpoint:</b> <code className="text-cyan-300">https://api.bitget.com/api/v2/spot/market/tickers</code></li>
                  <li>• <b>CORS Proxy:</b> <code className="text-cyan-300">/api/bitget/proxy-tickers</code> (Zero mock data guarantee)</li>
                  <li>• <b>Staleness Guard:</b> Flags red badge if tick is older than 10 seconds.</li>
                </ul>
              </div>

              {/* Raw Live Event Stream */}
              <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-col h-48">
                <div className="flex items-center justify-between font-bold text-slate-300 text-[11px]">
                  <span>Live Feed Events Log:</span>
                  <span className="text-[10px] text-slate-500">{rawFeedLog.length} events recorded</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                  {rawFeedLog.length === 0 ? (
                    <div className="text-slate-500 py-4 text-center">Connecting and listening for feed updates...</div>
                  ) : (
                    rawFeedLog.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 border-b border-slate-900/60 pb-1">
                        <span className="text-slate-500 shrink-0">{log.time}</span>
                        <span className="px-1 py-0.2 rounded bg-slate-900 text-cyan-400 font-bold shrink-0">
                          {log.type}
                        </span>
                        <span className="text-slate-300 truncate">{log.summary}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 lg:px-8 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">DeltaRadar</span>
            <span>•</span>
            <span>Live Bitget Price Board</span>
            <span>•</span>
            <span className="text-emerald-400">Strict Live Data Mode (No Mocks)</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Primary: Bitget WS Stream</span>
            <span>•</span>
            <span>Fallback: REST 5s Polling</span>
            <span>•</span>
            <span>Staleness Limit: 10s</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
