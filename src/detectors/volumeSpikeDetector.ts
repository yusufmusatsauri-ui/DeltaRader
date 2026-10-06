import { BitgetCandle } from '../types';

export interface VolumeSpikeResult {
  hasData: boolean;
  isSpike: boolean;
  currentVolume: number;
  averageVolume: number;
  ratio: number;
  multiplier: number;
  timeframe: string;
  candleTimestamp: number;
  summary: string;
}

/**
 * Volume Spike Detector
 * Computes rolling 20-period average volume on given timeframe (default 5m).
 * Fires when latest volume > multiplier * average.
 */
export function detectVolumeSpike(
  candles: BitgetCandle[],
  multiplier: number = 3.0,
  lookback: number = 20,
  timeframe: string = '5m'
): VolumeSpikeResult {
  if (!candles || candles.length < lookback + 1) {
    return {
      hasData: false,
      isSpike: false,
      currentVolume: 0,
      averageVolume: 0,
      ratio: 0,
      multiplier,
      timeframe,
      candleTimestamp: 0,
      summary: `Insufficient candle history (${candles?.length || 0}/${lookback + 1} required)`,
    };
  }

  const currentCandle = candles[candles.length - 1];
  const priorCandles = candles.slice(-(lookback + 1), -1);

  const sumVolume = priorCandles.reduce((acc, c) => acc + (c.volume || 0), 0);
  const avgVolume = sumVolume / priorCandles.length;

  if (avgVolume <= 0) {
    return {
      hasData: false,
      isSpike: false,
      currentVolume: currentCandle.volume || 0,
      averageVolume: 0,
      ratio: 0,
      multiplier,
      timeframe,
      candleTimestamp: currentCandle.timestamp,
      summary: 'Baseline average volume is zero',
    };
  }

  const ratio = (currentCandle.volume || 0) / avgVolume;
  const isSpike = ratio >= multiplier;

  return {
    hasData: true,
    isSpike,
    currentVolume: +(currentCandle.volume || 0).toFixed(2),
    averageVolume: +avgVolume.toFixed(2),
    ratio: +ratio.toFixed(2),
    multiplier,
    timeframe,
    candleTimestamp: currentCandle.timestamp,
    summary: isSpike
      ? `Volume surge: ${ratio.toFixed(1)}x over ${lookback}-period average (${currentCandle.volume.toFixed(0)} vs avg ${avgVolume.toFixed(0)})`
      : `Normal volume: ${ratio.toFixed(1)}x of average`,
  };
}
