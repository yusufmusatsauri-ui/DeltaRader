import { BitgetCandle } from '../types';
import { detectVolumeSpike, VolumeSpikeResult } from '../detectors/volumeSpikeDetector';
import { detectBreakout, BreakoutResult } from '../detectors/breakoutDetector';
import { detectNewsShift, NewsArticle, NewsShiftResult } from '../detectors/newsShiftDetector';

export type AnomalyTriggerType = 'volume_spike' | 'breakout' | 'news_shift';

export interface AlertSourceLink {
  title: string;
  url: string;
  source: string;
}

export interface AnomalyAlert {
  id: string;
  pair: string;
  triggerType: AnomalyTriggerType;
  triggerLabel: string;
  price: number;
  pctMove: number;
  volumeVsAverage: string;
  volumeRatio?: number;
  brokenLevel?: number;
  headline?: string;
  newsSource?: string;
  causeLabel?: string;
  timestamp: number;
  utcTimeString: string;
  source: string; // Formatted "Bitget [PAIR]"
  // AI Web Research & Catalyst
  aiComment?: string;
  aiSources?: AlertSourceLink[];
  aiLoading?: boolean;
}

export interface PairDetectorStatus {
  pair: string;
  volumeSpike: VolumeSpikeResult;
  breakout: BreakoutResult;
  newsShift: NewsShiftResult;
  hasCandleData: boolean;
  latestPrice: number;
  cooldownRemaining: Record<AnomalyTriggerType, number>; // seconds remaining
}

export interface AnomalyEngineConfig {
  volumeMultiplier: number; // default 3.0
  lookbackCandles: number;  // default 20
  timeframe: string;        // default '5m'
  cooldownMinutes: number;  // default 30 min per pair per trigger type
}

export const DEFAULT_ENGINE_CONFIG: AnomalyEngineConfig = {
  volumeMultiplier: 3.0,
  lookbackCandles: 20,
  timeframe: '5m',
  cooldownMinutes: 30,
};

export function formatUtcTime(timestampMs: number): string {
  if (!timestampMs || isNaN(timestampMs)) return '--:--:-- UTC';
  const d = new Date(timestampMs);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

/**
 * Anomaly Engine Core
 * Evaluates pairs against all three detectors and respects the 30-minute cooldown
 */
export class AnomalyEngine {
  private config: AnomalyEngineConfig;
  private cooldownMap: Map<string, number> = new Map(); // Key: `${pair}_${triggerType}` -> timestamp ms
  private seenHeadlineIds: Set<string> = new Set();

  constructor(config: Partial<AnomalyEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
  }

  public updateConfig(newConfig: Partial<AnomalyEngineConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): AnomalyEngineConfig {
    return { ...this.config };
  }

  public checkCooldown(pair: string, triggerType: AnomalyTriggerType, now: number): boolean {
    const key = `${pair}_${triggerType}`;
    const lastAlertTime = this.cooldownMap.get(key);
    if (!lastAlertTime) return true; // Can fire

    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    return now - lastAlertTime >= cooldownMs;
  }

  public getCooldownRemainingSec(pair: string, triggerType: AnomalyTriggerType, now: number): number {
    const key = `${pair}_${triggerType}`;
    const lastAlertTime = this.cooldownMap.get(key);
    if (!lastAlertTime) return 0;

    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    const elapsed = now - lastAlertTime;
    return elapsed >= cooldownMs ? 0 : Math.ceil((cooldownMs - elapsed) / 1000);
  }

  private markAlertFired(pair: string, triggerType: AnomalyTriggerType, now: number) {
    const key = `${pair}_${triggerType}`;
    this.cooldownMap.set(key, now);
  }

  /**
   * Evaluate a single pair given its 5m candles, optional prior-day candle, and current news articles
   */
  public evaluatePair(
    pair: string,
    candles5m: BitgetCandle[],
    priorDayCandle: BitgetCandle | null,
    headlines: NewsArticle[],
    now: number = Date.now()
  ): {
    newAlerts: AnomalyAlert[];
    status: PairDetectorStatus;
  } {
    const newAlerts: AnomalyAlert[] = [];

    // 1. Run Volume Spike Detector
    const volResult = detectVolumeSpike(
      candles5m,
      this.config.volumeMultiplier,
      this.config.lookbackCandles,
      this.config.timeframe
    );

    // 2. Run Breakout Detector
    const boResult = detectBreakout(
      candles5m,
      this.config.lookbackCandles,
      priorDayCandle
    );

    // 3. Run News/Sentiment Shift Detector
    const newsResult = detectNewsShift(
      pair,
      headlines,
      this.seenHeadlineIds
    );

    const hasCandleData = candles5m && candles5m.length >= this.config.lookbackCandles + 1;
    const latestCandle = candles5m && candles5m.length > 0 ? candles5m[candles5m.length - 1] : null;
    const latestPrice = latestCandle ? latestCandle.close : 0;

    // Calculate latest % move over current candle
    const pctMove = latestCandle && latestCandle.open > 0
      ? +(((latestCandle.close - latestCandle.open) / latestCandle.open) * 100).toFixed(2)
      : 0;

    const utcTimeStr = formatUtcTime(now);
    const sourceLabel = `Bitget ${pair}`;

    // Evaluate Volume Spike Anomaly
    if (volResult.isSpike && this.checkCooldown(pair, 'volume_spike', now)) {
      this.markAlertFired(pair, 'volume_spike', now);
      newAlerts.push({
        id: `vol-${pair}-${now}`,
        pair,
        triggerType: 'volume_spike',
        triggerLabel: `Volume Spike (${volResult.ratio}x)`,
        price: latestPrice,
        pctMove,
        volumeVsAverage: `${volResult.ratio}x avg (${volResult.currentVolume.toFixed(0)} vs ${volResult.averageVolume.toFixed(0)})`,
        volumeRatio: volResult.ratio,
        timestamp: now,
        utcTimeString: utcTimeStr,
        source: sourceLabel,
      });
    }

    // Evaluate Breakout Anomaly
    if (boResult.isBreakout && this.checkCooldown(pair, 'breakout', now)) {
      this.markAlertFired(pair, 'breakout', now);
      const dirText = boResult.direction === 'bullish_breakout' ? 'Breakout High' : 'Breakdown Low';
      newAlerts.push({
        id: `bo-${pair}-${now}`,
        pair,
        triggerType: 'breakout',
        triggerLabel: `${dirText} ($${boResult.brokenLevel})`,
        price: latestPrice,
        pctMove,
        volumeVsAverage: volResult.hasData ? `${volResult.ratio}x avg` : 'no vol data',
        brokenLevel: boResult.brokenLevel,
        timestamp: now,
        utcTimeString: utcTimeStr,
        source: sourceLabel,
      });
    }

    // Evaluate News Shift Anomaly
    if (newsResult.hasNewsShift && this.checkCooldown(pair, 'news_shift', now)) {
      const headline = newsResult.latestHeadline!;
      this.seenHeadlineIds.add(headline.id);
      this.markAlertFired(pair, 'news_shift', now);

      newAlerts.push({
        id: `news-${pair}-${headline.id}`,
        pair,
        triggerType: 'news_shift',
        triggerLabel: 'News Headline',
        price: latestPrice,
        pctMove,
        volumeVsAverage: volResult.hasData ? `${volResult.ratio}x avg` : 'n/a',
        headline: headline.title,
        newsSource: headline.source,
        causeLabel: newsResult.causeLabel,
        timestamp: now,
        utcTimeString: utcTimeStr,
        source: sourceLabel,
      });
    }

    const status: PairDetectorStatus = {
      pair,
      volumeSpike: volResult,
      breakout: boResult,
      newsShift: newsResult,
      hasCandleData,
      latestPrice,
      cooldownRemaining: {
        volume_spike: this.getCooldownRemainingSec(pair, 'volume_spike', now),
        breakout: this.getCooldownRemainingSec(pair, 'breakout', now),
        news_shift: this.getCooldownRemainingSec(pair, 'news_shift', now),
      },
    };

    return { newAlerts, status };
  }
}
