import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AnomalyAlert,
  AnomalyEngine,
  AnomalyEngineConfig,
  DEFAULT_ENGINE_CONFIG,
  PairDetectorStatus,
} from '../engine/anomalyEngine';
import { BitgetCandle } from '../types';
import { NewsArticle } from '../detectors/newsShiftDetector';

export const WATCHLIST_PAIRS: string[] = [
  'SOLUSDT',
  'BTCUSDT',
  'ETHUSDT',
  'RNVDAUSDT',
  'RMUUSDT',
  'RSNDKUSDT',
  'RMETAUSDT',
  'RMSFTUSDT',
  'RAAPLUSDT',
  'RSPCXUSDT',
  'RTSLAUSDT',
  'SUIUSDT',
  'AVAXUSDT',
  'DOGEUSDT',
  'NEARUSDT',
  'LINKUSDT',
  'ARBUSDT',
];

export function useAnomalyEngine() {
  const [config, setConfig] = useState<AnomalyEngineConfig>(DEFAULT_ENGINE_CONFIG);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [pairStatuses, setPairStatuses] = useState<Record<string, PairDetectorStatus>>({});
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [scanError, setScanError] = useState<string | null>(null);

  // Cached market data per pair to avoid redundant fetching
  const candlesCache = useRef<Record<string, BitgetCandle[]>>({});
  const priorDayCache = useRef<Record<string, BitgetCandle | null>>({});
  const headlinesCache = useRef<NewsArticle[]>([]);
  const lastNewsFetchTime = useRef<number>(0);

  // Engine instance
  const engineRef = useRef<AnomalyEngine>(new AnomalyEngine(config));
  const investigatedAlertIds = useRef<Set<string>>(new Set());

  // Keep engine config synchronized
  useEffect(() => {
    engineRef.current.updateConfig(config);
  }, [config]);

  // Call the AI once to search the web and generate 2-sentence catalyst comment + source links
  const investigateAlert = useCallback(async (alert: AnomalyAlert) => {
    if (investigatedAlertIds.current.has(alert.id)) return;
    investigatedAlertIds.current.add(alert.id);

    try {
      const res = await fetch('/api/ai/investigate-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.id,
          symbol: alert.pair,
          triggerType: alert.triggerType,
          triggerLabel: alert.triggerLabel,
          price: alert.price,
          pctMove: alert.pctMove,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id
              ? {
                  ...a,
                  aiComment: data.comment || 'Research unavailable.',
                  aiSources: Array.isArray(data.sources) ? data.sources : [],
                  aiLoading: false,
                }
              : a
          )
        );
        return;
      }
    } catch (err: any) {
      console.warn('[useAnomalyEngine] AI investigation failed:', err.message);
    }

    // Rule: If search fails, show "research unavailable."
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alert.id
          ? {
              ...a,
              aiComment: 'Research unavailable.',
              aiSources: [],
              aiLoading: false,
            }
          : a
      )
    );
  }, []);

  // Fetch real crypto news headlines from /api/news
  const fetchNews = useCallback(async (): Promise<NewsArticle[]> => {
    const now = Date.now();
    // Cache news for 2 minutes
    if (headlinesCache.current.length > 0 && now - lastNewsFetchTime.current < 120_000) {
      return headlinesCache.current;
    }

    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.news)) {
          headlinesCache.current = data.news;
          lastNewsFetchTime.current = now;
          return data.news;
        }
      }
    } catch (err: any) {
      console.warn('[AnomalyEngine] News fetch warning:', err.message);
    }
    return headlinesCache.current;
  }, []);

  // Fetch candles for a pair using existing Bitget endpoint
  const fetchPairCandles = useCallback(async (pair: string): Promise<BitgetCandle[]> => {
    try {
      const res = await fetch(`/api/bitget/candles?symbol=${pair}&period=5m&limit=40`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.candles) && data.candles.length > 0) {
          candlesCache.current[pair] = data.candles;
          return data.candles;
        }
      }
    } catch (err: any) {
      console.warn(`[AnomalyEngine] Candles fetch failed for ${pair}:`, err.message);
    }
    return candlesCache.current[pair] || [];
  }, []);

  // Fetch prior-day candle for breakout detection
  const fetchPriorDayCandle = useCallback(async (pair: string): Promise<BitgetCandle | null> => {
    if (priorDayCache.current[pair]) return priorDayCache.current[pair];
    try {
      const res = await fetch(`/api/bitget/candles?symbol=${pair}&period=1d&limit=3`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.candles) && data.candles.length >= 2) {
          // Prior-day is the candle before the current incomplete day candle
          const prior = data.candles[data.candles.length - 2];
          priorDayCache.current[pair] = prior;
          return prior;
        }
      }
    } catch (err: any) {
      console.warn(`[AnomalyEngine] Prior day candle fetch failed for ${pair}:`, err.message);
    }
    return null;
  }, []);

  // Execute one scan cycle across all pairs
  const runScanCycle = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);
    const now = Date.now();

    try {
      // 1. Fetch fresh headlines
      const newsArticles = await fetchNews();

      const newAlertsFound: AnomalyAlert[] = [];
      const updatedStatuses: Record<string, PairDetectorStatus> = {};

      // 2. Evaluate each pair against the detectors
      for (const pair of WATCHLIST_PAIRS) {
        const candles5m = await fetchPairCandles(pair);
        const priorDay = await fetchPriorDayCandle(pair);

        const { newAlerts, status } = engineRef.current.evaluatePair(
          pair,
          candles5m,
          priorDay,
          newsArticles,
          now
        );

        if (newAlerts.length > 0) {
          newAlertsFound.push(...newAlerts);
        }
        updatedStatuses[pair] = status;
      }

      // Prepend any newly triggered alerts to the top of the feed and call AI once per alert
      if (newAlertsFound.length > 0) {
        const withLoading = newAlertsFound.map((a) => ({
          ...a,
          aiLoading: true,
        }));
        setAlerts((prev) => [...withLoading, ...prev].slice(0, 100)); // Cap at 100

        // Call the AI once to search web and formulate comment
        newAlertsFound.forEach((alert) => {
          investigateAlert(alert);
        });
      }

      setPairStatuses(updatedStatuses);
      setLastScanTime(now);
    } catch (err: any) {
      setScanError(`Scan cycle encountered an issue: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  }, [fetchNews, fetchPairCandles, fetchPriorDayCandle]);

  // Periodic scan loop (runs every 15 seconds)
  useEffect(() => {
    runScanCycle();
    const interval = setInterval(runScanCycle, 15000);
    return () => clearInterval(interval);
  }, [runScanCycle]);

  // Update volume multiplier configuration
  const setVolumeMultiplier = useCallback((multiplier: number) => {
    setConfig((prev) => ({
      ...prev,
      volumeMultiplier: Math.max(1.5, Math.min(10, +multiplier.toFixed(1))),
    }));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    pairStatuses,
    config,
    setVolumeMultiplier,
    clearAlerts,
    isScanning,
    lastScanTime,
    scanError,
    triggerManualScan: runScanCycle,
    investigateAlert,
  };
}
