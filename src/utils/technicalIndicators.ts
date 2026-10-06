import { BitgetCandle } from '../types';

export interface IndicatorValues {
  sma20: (number | null)[];
  sma50: (number | null)[];
  ema20: (number | null)[];
  ema50: (number | null)[];
  rsi: (number | null)[];
  macd: {
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
  };
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(candles: BitgetCandle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period || period <= 0) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  result[period - 1] = sum / period;

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    result[i] = sum / period;
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: BitgetCandle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period || period <= 0) return result;

  const k = 2 / (period + 1);

  // Seed with initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < candles.length; i++) {
    const currentEma = candles[i].close * k + prevEma * (1 - k);
    result[i] = currentEma;
    prevEma = currentEma;
  }

  return result;
}

/**
 * Calculate Relative Strength Index (RSI) using Wilder's smoothed method
 */
export function calculateRSI(candles: BitgetCandle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period || period <= 0) return result;

  let gains = 0;
  let losses = 0;

  // First period calculations
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - (100 / (1 + rs));
  }

  // Subsequent smoothed values
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const currentGain = change >= 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }
  }

  return result;
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(
  candles: BitgetCandle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const len = candles.length;
  const macdLine: (number | null)[] = new Array(len).fill(null);
  const signalLine: (number | null)[] = new Array(len).fill(null);
  const histogram: (number | null)[] = new Array(len).fill(null);

  if (len < slowPeriod) {
    return { macdLine, signalLine, histogram };
  }

  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);

  // Compute MACD Line = Fast EMA - Slow EMA
  for (let i = slowPeriod - 1; i < len; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      macdLine[i] = fastEma[i]! - slowEma[i]!;
    }
  }

  // Compute Signal Line = EMA of MACD Line
  const validMacdIndices: number[] = [];
  const validMacdValues: number[] = [];

  for (let i = 0; i < len; i++) {
    if (macdLine[i] !== null) {
      validMacdIndices.push(i);
      validMacdValues.push(macdLine[i]!);
    }
  }

  if (validMacdValues.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);

    // Initial SMA of MACD line
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
      sum += validMacdValues[i];
    }
    let prevSig = sum / signalPeriod;
    const firstSigIndex = validMacdIndices[signalPeriod - 1];
    signalLine[firstSigIndex] = prevSig;
    histogram[firstSigIndex] = macdLine[firstSigIndex]! - prevSig;

    for (let i = signalPeriod; i < validMacdValues.length; i++) {
      const currentSig = validMacdValues[i] * k + prevSig * (1 - k);
      const actualIndex = validMacdIndices[i];
      signalLine[actualIndex] = currentSig;
      histogram[actualIndex] = macdLine[actualIndex]! - currentSig;
      prevSig = currentSig;
    }
  }

  return { macdLine, signalLine, histogram };
}
