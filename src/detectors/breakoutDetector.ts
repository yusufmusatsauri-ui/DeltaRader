import { BitgetCandle } from '../types';

export type BreakoutDirection = 'bullish_breakout' | 'bearish_breakdown';
export type BreakoutLevelType = 'swing_high' | 'swing_low' | 'prior_day_high' | 'prior_day_low';

export interface BreakoutResult {
  hasData: boolean;
  isBreakout: boolean;
  direction?: BreakoutDirection;
  levelType?: BreakoutLevelType;
  brokenLevel?: number;
  currentClose?: number;
  penetrationPct?: number;
  swingHigh?: number;
  swingLow?: number;
  priorDayHigh?: number;
  priorDayLow?: number;
  candleTimestamp?: number;
  summary: string;
}

/**
 * Breakout Detector
 * Tracks recent swing high/low (default 20 candles) and prior-day high/low.
 * Fires when current candle closes beyond one of these key levels.
 */
export function detectBreakout(
  candles: BitgetCandle[],
  lookback: number = 20,
  priorDayCandle?: BitgetCandle | null
): BreakoutResult {
  if (!candles || candles.length < lookback + 1) {
    return {
      hasData: false,
      isBreakout: false,
      summary: `Insufficient candle history (${candles?.length || 0}/${lookback + 1} required for swing levels)`,
    };
  }

  const currentCandle = candles[candles.length - 1];
  const priorCandles = candles.slice(-(lookback + 1), -1);

  let swingHigh = -Infinity;
  let swingLow = Infinity;

  priorCandles.forEach((c) => {
    if (c.high > swingHigh) swingHigh = c.high;
    if (c.low < swingLow) swingLow = c.low;
  });

  const closePrice = currentCandle.close;
  const priorDayHigh = priorDayCandle?.high;
  const priorDayLow = priorDayCandle?.low;

  // Check Prior-Day Breakout first (macro level)
  if (priorDayHigh && closePrice > priorDayHigh) {
    const penPct = +(((closePrice - priorDayHigh) / priorDayHigh) * 100).toFixed(2);
    return {
      hasData: true,
      isBreakout: true,
      direction: 'bullish_breakout',
      levelType: 'prior_day_high',
      brokenLevel: priorDayHigh,
      currentClose: closePrice,
      penetrationPct: penPct,
      swingHigh,
      swingLow,
      priorDayHigh,
      priorDayLow,
      candleTimestamp: currentCandle.timestamp,
      summary: `Breakout above prior-day high (${priorDayHigh}) by +${penPct}%`,
    };
  }

  if (priorDayLow && closePrice < priorDayLow) {
    const penPct = +(((priorDayLow - closePrice) / priorDayLow) * 100).toFixed(2);
    return {
      hasData: true,
      isBreakout: true,
      direction: 'bearish_breakdown',
      levelType: 'prior_day_low',
      brokenLevel: priorDayLow,
      currentClose: closePrice,
      penetrationPct: penPct,
      swingHigh,
      swingLow,
      priorDayHigh,
      priorDayLow,
      candleTimestamp: currentCandle.timestamp,
      summary: `Breakdown below prior-day low (${priorDayLow}) by -${penPct}%`,
    };
  }

  // Check Recent Swing High/Low Breakout (micro level)
  if (swingHigh > 0 && closePrice > swingHigh) {
    const penPct = +(((closePrice - swingHigh) / swingHigh) * 100).toFixed(2);
    return {
      hasData: true,
      isBreakout: true,
      direction: 'bullish_breakout',
      levelType: 'swing_high',
      brokenLevel: swingHigh,
      currentClose: closePrice,
      penetrationPct: penPct,
      swingHigh,
      swingLow,
      priorDayHigh,
      priorDayLow,
      candleTimestamp: currentCandle.timestamp,
      summary: `Breakout above ${lookback}-period swing high (${swingHigh}) by +${penPct}%`,
    };
  }

  if (swingLow < Infinity && closePrice < swingLow) {
    const penPct = +(((swingLow - closePrice) / swingLow) * 100).toFixed(2);
    return {
      hasData: true,
      isBreakout: true,
      direction: 'bearish_breakdown',
      levelType: 'swing_low',
      brokenLevel: swingLow,
      currentClose: closePrice,
      penetrationPct: penPct,
      swingHigh,
      swingLow,
      priorDayHigh,
      priorDayLow,
      candleTimestamp: currentCandle.timestamp,
      summary: `Breakdown below ${lookback}-period swing low (${swingLow}) by -${penPct}%`,
    };
  }

  return {
    hasData: true,
    isBreakout: false,
    currentClose: closePrice,
    swingHigh: swingHigh > 0 ? swingHigh : undefined,
    swingLow: swingLow < Infinity ? swingLow : undefined,
    priorDayHigh,
    priorDayLow,
    candleTimestamp: currentCandle.timestamp,
    summary: `Within range (Swing High: ${swingHigh}, Swing Low: ${swingLow})`,
  };
}
