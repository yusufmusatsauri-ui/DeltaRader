import { useState, useEffect, useRef, useCallback } from 'react';
import { BitgetCandle } from '../types';

export type CandleTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
  depthPct: number;
}

export interface BitgetOrderBookState {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPct: number;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  timestamp: number;
  receivedAt: number;
  isStale: boolean;
  sourceLabel: string;
  channel: 'ws' | 'rest';
}

export interface CandleState {
  candles: BitgetCandle[];
  lastUpdate: number;
  isStale: boolean;
  sourceLabel: string;
  channel: 'ws' | 'rest';
}

const TIMEFRAME_CONFIG: Record<CandleTimeframe, { wsChannel: string; restGranularity: string }> = {
  '1m': { wsChannel: 'candle1m', restGranularity: '1min' },
  '5m': { wsChannel: 'candle5m', restGranularity: '5min' },
  '15m': { wsChannel: 'candle15m', restGranularity: '15min' },
  '1h': { wsChannel: 'candle1H', restGranularity: '1h' },
  '4h': { wsChannel: 'candle4H', restGranularity: '4h' },
  '1D': { wsChannel: 'candle1D', restGranularity: '1day' },
};

export function formatUtcTime(timestampMs: number): string {
  if (!timestampMs || isNaN(timestampMs)) return '--:--:-- UTC';
  const d = new Date(timestampMs);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

export function useBitgetMarketData(symbol: string, timeframe: CandleTimeframe) {
  // Candle state
  const [candles, setCandles] = useState<BitgetCandle[]>([]);
  const [candleLastUpdate, setCandleLastUpdate] = useState<number>(0);
  const [candleChannel, setCandleChannel] = useState<'ws' | 'rest'>('rest');
  const [candleLoading, setCandleLoading] = useState<boolean>(true);
  const [candleError, setCandleError] = useState<string | null>(null);

  // Order book state
  const [orderBook, setOrderBook] = useState<BitgetOrderBookState | null>(null);
  const [orderBookLoading, setOrderBookLoading] = useState<boolean>(true);
  const [orderBookError, setOrderBookError] = useState<string | null>(null);

  // WebSocket status
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const restPollRef = useRef<any>(null);
  const activeSubRef = useRef<{ symbol: string; timeframe: CandleTimeframe } | null>(null);

  // Live timer for staleness check
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  // Process raw order book snapshot
  const processOrderBookData = useCallback((rawBids: any[], rawAsks: any[], ts: number, channel: 'ws' | 'rest') => {
    try {
      const parsedBids: [number, number][] = (rawBids || [])
        .slice(0, 15)
        .map((item: any): [number, number] => [parseFloat(item[0]), parseFloat(item[1])])
        .filter(([p, s]) => !isNaN(p) && !isNaN(s) && p > 0);

      const parsedAsks: [number, number][] = (rawAsks || [])
        .slice(0, 15)
        .map((item: any): [number, number] => [parseFloat(item[0]), parseFloat(item[1])])
        .filter(([p, s]) => !isNaN(p) && !isNaN(s) && p > 0);

      if (parsedBids.length === 0 || parsedAsks.length === 0) return;

      // Sort bids desc (highest buy first), asks asc (lowest sell first)
      parsedBids.sort((a, b) => b[0] - a[0]);
      parsedAsks.sort((a, b) => a[0] - b[0]);

      let bidAccum = 0;
      const bidsWithDepth: OrderBookEntry[] = parsedBids.map(([price, size]) => {
        bidAccum += size;
        return { price, size, total: bidAccum, depthPct: 0 };
      });

      let askAccum = 0;
      const asksWithDepth: OrderBookEntry[] = parsedAsks.map(([price, size]) => {
        askAccum += size;
        return { price, size, total: askAccum, depthPct: 0 };
      });

      const maxTotal = Math.max(bidAccum, askAccum) || 1;
      bidsWithDepth.forEach((b) => (b.depthPct = Math.min(100, Math.round((b.total / maxTotal) * 100))));
      asksWithDepth.forEach((a) => (a.depthPct = Math.min(100, Math.round((a.total / maxTotal) * 100))));

      const bestBid = bidsWithDepth[0].price;
      const bestAsk = asksWithDepth[0].price;
      const spread = +(bestAsk - bestBid).toFixed(4);
      const midPrice = +((bestAsk + bestBid) / 2).toFixed(4);
      const spreadPct = +((spread / midPrice) * 100).toFixed(3);

      const timeUtc = formatUtcTime(ts);
      setOrderBook({
        bids: bidsWithDepth,
        asks: asksWithDepth,
        spread,
        spreadPct,
        bestBid,
        bestAsk,
        midPrice,
        timestamp: ts,
        receivedAt: Date.now(),
        isStale: false,
        sourceLabel: `Bitget ${symbol} ${timeUtc}`,
        channel,
      });
      setOrderBookError(null);
      setOrderBookLoading(false);
    } catch (err: any) {
      console.warn('Error processing order book:', err);
    }
  }, [symbol]);

  // REST fallback for candles
  const fetchCandlesRest = useCallback(async () => {
    try {
      const res = await fetch(`/api/bitget/candles?symbol=${symbol}&period=${timeframe}&limit=100`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.candles) && data.candles.length > 0) {
        setCandles(data.candles);
        const lastCandle = data.candles[data.candles.length - 1];
        const ts = lastCandle ? lastCandle.timestamp * 1000 : Date.now();
        setCandleLastUpdate(ts);
        setCandleChannel('rest');
        setCandleError(null);
        setCandleLoading(false);
        return;
      }
      throw new Error(data.error || 'No candle data returned');
    } catch (err: any) {
      // If we already have candles, keep them but warn; else show error state
      setCandles((prev) => {
        if (prev.length === 0) {
          setCandleError(`Failed to fetch Bitget candle data: ${err.message}`);
        }
        return prev;
      });
      setCandleLoading(false);
    }
  }, [symbol, timeframe]);

  // REST fallback for order book
  const fetchOrderBookRest = useCallback(async () => {
    try {
      const res = await fetch(`/api/bitget/orderbook?symbol=${symbol}&limit=15`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.bids && data.asks) {
        processOrderBookData(data.bids, data.asks, data.timestamp || Date.now(), 'rest');
        return;
      }
      throw new Error(data.error || 'Empty order book');
    } catch (err: any) {
      setOrderBook((prev) => {
        if (!prev) {
          setOrderBookError(`Failed to fetch Bitget order book: ${err.message}`);
        }
        return prev;
      });
      setOrderBookLoading(false);
    }
  }, [symbol, processOrderBookData]);

  // Establish and manage Bitget Public WebSocket
  useEffect(() => {
    let isCancelled = false;
    setCandleLoading(true);
    setOrderBookLoading(true);

    // Initial load via REST to immediately populate UI
    fetchCandlesRest();
    fetchOrderBookRest();

    const tfCfg = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG['5m'];
    const currentWsChannel = tfCfg.wsChannel;

    let socket: WebSocket;

    function initSocket() {
      try {
        socket = new WebSocket('wss://ws.bitget.com/v2/ws/public');
        wsRef.current = socket;

        socket.onopen = () => {
          if (isCancelled) return;
          setWsConnected(true);

          // Subscribe to selected pair's candle channel and books15 channel
          const subPayload = JSON.stringify({
            op: 'subscribe',
            args: [
              {
                instType: 'SPOT',
                channel: currentWsChannel,
                instId: symbol,
              },
              {
                instType: 'SPOT',
                channel: 'books15',
                instId: symbol,
              },
            ],
          });
          socket.send(subPayload);
          activeSubRef.current = { symbol, timeframe };

          // Bitget keepalive heartbeat: send 'ping' every 25s
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send('ping');
            }
          }, 25000);
        };

        socket.onmessage = (event) => {
          if (isCancelled) return;
          const raw = event.data;
          if (raw === 'pong') return;

          try {
            const parsed = JSON.parse(raw);

            // Handle Candle snapshot or incremental update
            if (parsed.arg?.channel === currentWsChannel && parsed.arg?.instId === symbol) {
              if (Array.isArray(parsed.data) && parsed.data.length > 0) {
                const incomingCandles: BitgetCandle[] = parsed.data.map((item: any) => ({
                  timestamp: Math.floor(parseFloat(item[0]) / 1000),
                  open: parseFloat(item[1]),
                  high: parseFloat(item[2]),
                  low: parseFloat(item[3]),
                  close: parseFloat(item[4]),
                  volume: parseFloat(item[5]),
                  period: timeframe,
                }));

                setCandles((prev) => {
                  if (parsed.action === 'snapshot') {
                    // Replace or merge snapshot
                    incomingCandles.sort((a, b) => a.timestamp - b.timestamp);
                    return incomingCandles;
                  }

                  // Incremental update
                  const next = [...prev];
                  incomingCandles.forEach((incoming) => {
                    const idx = next.findIndex((c) => c.timestamp === incoming.timestamp);
                    if (idx >= 0) {
                      next[idx] = incoming;
                    } else if (next.length === 0 || incoming.timestamp > next[next.length - 1].timestamp) {
                      next.push(incoming);
                    }
                  });
                  return next.slice(-150); // Keep last 150 candles
                });

                const latestTs = parseInt(parsed.data[parsed.data.length - 1][0], 10) || Date.now();
                setCandleLastUpdate(latestTs);
                setCandleChannel('ws');
                setCandleError(null);
                setCandleLoading(false);
              }
            }

            // Handle Order Book depth (books15 snapshot)
            if (parsed.arg?.channel === 'books15' && parsed.arg?.instId === symbol) {
              if (Array.isArray(parsed.data) && parsed.data.length > 0) {
                const bookData = parsed.data[0];
                const ts = parseInt(bookData.ts || parsed.ts || String(Date.now()), 10);
                processOrderBookData(bookData.bids || [], bookData.asks || [], ts, 'ws');
              }
            }
          } catch (err: any) {
            console.warn('WS parse warning:', err);
          }
        };

        socket.onerror = () => {
          if (isCancelled) return;
          setWsConnected(false);
        };

        socket.onclose = () => {
          if (isCancelled) return;
          setWsConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        };
      } catch (err) {
        console.warn('Bitget socket init error:', err);
      }
    }

    initSocket();

    // Secondary periodic REST polling as fallback (every 6s)
    restPollRef.current = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchCandlesRest();
        fetchOrderBookRest();
      }
    }, 6000);

    return () => {
      isCancelled = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (restPollRef.current) clearInterval(restPollRef.current);

      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(
            JSON.stringify({
              op: 'unsubscribe',
              args: [
                { instType: 'SPOT', channel: currentWsChannel, instId: symbol },
                { instType: 'SPOT', channel: 'books15', instId: symbol },
              ],
            })
          );
          socket.close();
        } catch {}
      }
    };
  }, [symbol, timeframe, fetchCandlesRest, fetchOrderBookRest, processOrderBookData]);

  // Compute 10-second staleness
  const candleElapsedSec = candleLastUpdate > 0 ? (currentTime - candleLastUpdate) / 1000 : 999;
  const isCandleStale = candleElapsedSec > 10;

  const orderBookElapsedSec = orderBook?.timestamp ? (currentTime - orderBook.timestamp) / 1000 : 999;
  const isOrderBookStale = orderBookElapsedSec > 10;

  const candleUtcTime = formatUtcTime(candleLastUpdate);
  const candleSourceLabel = `Bitget ${symbol} ${timeframe} ${candleUtcTime}`;

  return {
    candles,
    candleLoading,
    candleError,
    candleLastUpdate,
    candleElapsedSec,
    isCandleStale,
    candleChannel,
    candleSourceLabel,
    orderBook,
    orderBookLoading,
    orderBookError,
    orderBookElapsedSec,
    isOrderBookStale,
    wsConnected,
    retryCandles: fetchCandlesRest,
    retryOrderBook: fetchOrderBookRest,
  };
}
