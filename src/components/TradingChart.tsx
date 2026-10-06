import React, { useState, useMemo, useRef } from 'react';
import { AssetBadge } from './AssetBadge';
import {
  Activity,
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  Layers,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings2,
  Sliders,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { BitgetCandle } from '../types';
import { CandleTimeframe } from '../hooks/useBitgetMarketData';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
} from '../utils/technicalIndicators';

interface TradingChartProps {
  symbol: string;
  timeframe: CandleTimeframe;
  onTimeframeChange: (tf: CandleTimeframe) => void;
  candles: BitgetCandle[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
  isStale: boolean;
  elapsedSec: number;
  sourceLabel: string;
  channel: 'ws' | 'rest';
  onRetry: () => void;
}

// Helper to build SVG path data string safely
function buildSvgPath(points: Array<{ x: number; y: number } | null>): string | undefined {
  const valid = points.filter((p): p is { x: number; y: number } => p !== null && !isNaN(p.x) && !isNaN(p.y));
  if (valid.length === 0) return undefined;
  return valid.map((p, idx) => (idx === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)).join(' ');
}

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  timeframe,
  onTimeframeChange,
  candles,
  isLoading,
  error,
  lastUpdate,
  isStale,
  elapsedSec,
  sourceLabel,
  channel,
  onRetry,
}) => {
  // Indicator toggles & parameters
  const [showSma, setShowSma] = useState<boolean>(true);
  const [smaPeriod1, setSmaPeriod1] = useState<number>(20);
  const [smaPeriod2, setSmaPeriod2] = useState<number>(50);

  const [showEma, setShowEma] = useState<boolean>(false);
  const [emaPeriod1, setEmaPeriod1] = useState<number>(20);
  const [emaPeriod2, setEmaPeriod2] = useState<number>(50);

  const [showRsi, setShowRsi] = useState<boolean>(true);
  const [rsiPeriod, setRsiPeriod] = useState<number>(14);

  const [showMacd, setShowMacd] = useState<boolean>(true);
  const [macdFast, setMacdFast] = useState<number>(12);
  const [macdSlow, setMacdSlow] = useState<number>(26);
  const [macdSignal, setMacdSignal] = useState<number>(9);

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Timeframes list
  const TIMEFRAMES: CandleTimeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

  // Calculate technical indicators directly from Bitget candle data
  const indicators = useMemo(() => {
    if (!candles || candles.length === 0) {
      return {
        sma1: [],
        sma2: [],
        ema1: [],
        ema2: [],
        rsi: [],
        macd: { macdLine: [], signalLine: [], histogram: [] },
      };
    }

    return {
      sma1: showSma ? calculateSMA(candles, smaPeriod1) : [],
      sma2: showSma ? calculateSMA(candles, smaPeriod2) : [],
      ema1: showEma ? calculateEMA(candles, emaPeriod1) : [],
      ema2: showEma ? calculateEMA(candles, emaPeriod2) : [],
      rsi: showRsi ? calculateRSI(candles, rsiPeriod) : [],
      macd: showMacd ? calculateMACD(candles, macdFast, macdSlow, macdSignal) : { macdLine: [], signalLine: [], histogram: [] },
    };
  }, [
    candles,
    showSma,
    smaPeriod1,
    smaPeriod2,
    showEma,
    emaPeriod1,
    emaPeriod2,
    showRsi,
    rsiPeriod,
    showMacd,
    macdFast,
    macdSlow,
    macdSignal,
  ]);

  // Dimensions
  const chartWidth = 840;
  const priceChartHeight = 340;
  const rsiHeight = showRsi ? 90 : 0;
  const macdHeight = showMacd ? 95 : 0;
  const totalHeight = priceChartHeight + rsiHeight + macdHeight;
  const paddingLeft = 12;
  const paddingRight = 68;
  const paddingTop = 24;
  const paddingBottom = 40;

  // Viewport candle slice (last 60 candles)
  const displayCandles = useMemo(() => {
    return candles.slice(-60);
  }, [candles]);

  const offsetIndex = candles.length - displayCandles.length;

  // Coordinate scales
  const scales = useMemo(() => {
    if (displayCandles.length === 0) return null;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    displayCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    // Factor in visible moving averages in price range
    displayCandles.forEach((_, i) => {
      const globalIdx = offsetIndex + i;
      if (showSma) {
        const v1 = indicators.sma1[globalIdx];
        const v2 = indicators.sma2[globalIdx];
        if (v1 && v1 < minPrice) minPrice = v1;
        if (v1 && v1 > maxPrice) maxPrice = v1;
        if (v2 && v2 < minPrice) minPrice = v2;
        if (v2 && v2 > maxPrice) maxPrice = v2;
      }
      if (showEma) {
        const v1 = indicators.ema1[globalIdx];
        const v2 = indicators.ema2[globalIdx];
        if (v1 && v1 < minPrice) minPrice = v1;
        if (v1 && v1 > maxPrice) maxPrice = v1;
        if (v2 && v2 < minPrice) minPrice = v2;
        if (v2 && v2 > maxPrice) maxPrice = v2;
      }
    });

    const priceBuffer = (maxPrice - minPrice) * 0.06 || 1;
    minPrice -= priceBuffer;
    maxPrice += priceBuffer;

    const plotWidth = chartWidth - paddingLeft - paddingRight;
    const candleWidth = plotWidth / displayCandles.length;
    const bodyWidth = Math.max(3, candleWidth * 0.72);

    const priceToPlotY = (p: number) => {
      const ratio = (p - minPrice) / (maxPrice - minPrice);
      return (priceChartHeight - paddingBottom) - ratio * (priceChartHeight - paddingTop - paddingBottom);
    };

    const volumeToPlotY = (v: number) => {
      const volMax = maxVolume || 1;
      const ratio = v / volMax;
      const volHeight = (priceChartHeight - paddingTop - paddingBottom) * 0.22;
      return (priceChartHeight - paddingBottom) - ratio * volHeight;
    };

    const candleToX = (index: number) => {
      return paddingLeft + index * candleWidth + candleWidth / 2;
    };

    return {
      minPrice,
      maxPrice,
      maxVolume,
      plotWidth,
      candleWidth,
      bodyWidth,
      priceToPlotY,
      volumeToPlotY,
      candleToX,
    };
  }, [displayCandles, offsetIndex, indicators, showSma, showEma]);

  // Active hovered candle
  const activeCandle = hoverIndex !== null && displayCandles[hoverIndex]
    ? displayCandles[hoverIndex]
    : displayCandles[displayCandles.length - 1];

  const activeGlobalIndex = hoverIndex !== null
    ? offsetIndex + hoverIndex
    : candles.length - 1;

  // Handle mouse move on chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !scales || displayCandles.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const xInSvg = (clientX / rect.width) * chartWidth;

    if (xInSvg >= paddingLeft && xInSvg <= chartWidth - paddingRight) {
      const idx = Math.floor((xInSvg - paddingLeft) / scales.candleWidth);
      if (idx >= 0 && idx < displayCandles.length) {
        setHoverIndex(idx);
        return;
      }
    }
    setHoverIndex(null);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Helper formatters
  const formatPrice = (val: number) => {
    if (val === undefined || isNaN(val)) return '--';
    if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return val.toFixed(2);
    if (val >= 0.01) return val.toFixed(4);
    return val.toFixed(6);
  };

  const formatVol = (val: number) => {
    if (!val) return '0';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
    return val.toFixed(0);
  };

  const formatCandleTime = (tsSec: number) => {
    const d = new Date(tsSec * 1000);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min} UTC`;
  };

  return (
    <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-xl overflow-hidden flex flex-col shadow-xl">
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-[#0c1222]/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AssetBadge
              symbol={symbol}
              size="md"
              showLogo={true}
              showSource={true}
              showClassTag={true}
            />
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#070b14] p-0.5 rounded-lg border border-slate-800/90">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Freshness Badge (10s Staleness Guard) */}
          <div className="flex items-center gap-1.5">
            {isStale ? (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                STALE ({elapsedSec.toFixed(0)}s)
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                LIVE ({channel.toUpperCase()})
              </span>
            )}
          </div>
        </div>

        {/* Source Label & Indicator Toggles */}
        <div className="flex items-center gap-3">
          {/* Label Requirement: "Bitget [PAIR] [timeframe]" with last-update timestamp */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-[#070b14] px-2.5 py-1 rounded border border-slate-800/90">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{sourceLabel}</span>
          </div>

          {/* Indicator toggles bar */}
          <div className="flex items-center gap-1 bg-[#070b14] p-1 rounded-lg border border-slate-800/90">
            <button
              onClick={() => setShowSma(!showSma)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                showSma ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Simple Moving Averages"
            >
              SMA
            </button>
            <button
              onClick={() => setShowEma(!showEma)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                showEma ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Exponential Moving Averages"
            >
              EMA
            </button>
            <button
              onClick={() => setShowRsi(!showRsi)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                showRsi ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Relative Strength Index"
            >
              RSI
            </button>
            <button
              onClick={() => setShowMacd(!showMacd)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                showMacd ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle MACD Indicator"
            >
              MACD
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1 rounded text-slate-400 hover:text-slate-200 transition-colors ${
                showSettings ? 'bg-slate-800 text-slate-100' : ''
              }`}
              title="Adjust Indicator Periods"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onRetry}
              disabled={isLoading}
              className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh Market Candles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Indicator Configuration Popover */}
      {showSettings && (
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          {/* SMA Settings */}
          <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-amber-300 font-semibold">
              <span>SMA Periods</span>
              <span className="text-[10px] text-slate-500">Amber / Blue</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Fast:</label>
              <input
                type="number"
                min="2"
                max="200"
                value={smaPeriod1}
                onChange={(e) => setSmaPeriod1(Math.max(2, parseInt(e.target.value) || 20))}
                className="w-16 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-100"
              />
              <label className="text-slate-400 ml-2">Slow:</label>
              <input
                type="number"
                min="5"
                max="200"
                value={smaPeriod2}
                onChange={(e) => setSmaPeriod2(Math.max(5, parseInt(e.target.value) || 50))}
                className="w-16 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-100"
              />
            </div>
          </div>

          {/* EMA Settings */}
          <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-purple-300 font-semibold">
              <span>EMA Periods</span>
              <span className="text-[10px] text-slate-500">Purple / Pink</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Fast:</label>
              <input
                type="number"
                min="2"
                max="200"
                value={emaPeriod1}
                onChange={(e) => setEmaPeriod1(Math.max(2, parseInt(e.target.value) || 20))}
                className="w-16 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-100"
              />
              <label className="text-slate-400 ml-2">Slow:</label>
              <input
                type="number"
                min="5"
                max="200"
                value={emaPeriod2}
                onChange={(e) => setEmaPeriod2(Math.max(5, parseInt(e.target.value) || 50))}
                className="w-16 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-100"
              />
            </div>
          </div>

          {/* RSI & MACD Settings */}
          <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-cyan-300 font-semibold">
              <span>RSI / MACD Config</span>
              <span className="text-[10px] text-slate-500">Sub-panels</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400">RSI:</label>
              <input
                type="number"
                min="2"
                max="50"
                value={rsiPeriod}
                onChange={(e) => setRsiPeriod(Math.max(2, parseInt(e.target.value) || 14))}
                className="w-12 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-100"
              />
              <label className="text-slate-400 ml-1">MACD:</label>
              <span className="text-slate-300 font-mono text-[11px]">{macdFast}/{macdSlow}/{macdSignal}</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Candlestick Detail Strip (OHLCV & Indicator Values) */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
        {activeCandle ? (
          <>
            <span className="text-slate-500">{formatCandleTime(activeCandle.timestamp)}</span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">O: <strong className="text-slate-200">{formatPrice(activeCandle.open)}</strong></span>
              <span className="text-slate-400">H: <strong className="text-emerald-400">{formatPrice(activeCandle.high)}</strong></span>
              <span className="text-slate-400">L: <strong className="text-rose-400">{formatPrice(activeCandle.low)}</strong></span>
              <span className="text-slate-400">C: <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{formatPrice(activeCandle.close)}</strong></span>
              <span className="text-slate-400">Vol: <strong className="text-slate-300">{formatVol(activeCandle.volume)}</strong></span>
            </div>

            {/* Readouts for active indicators */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800 text-[11px]">
              {showSma && indicators.sma1[activeGlobalIndex] !== null && (
                <span className="text-amber-400">SMA({smaPeriod1}): {formatPrice(indicators.sma1[activeGlobalIndex]!)}</span>
              )}
              {showSma && indicators.sma2[activeGlobalIndex] !== null && (
                <span className="text-blue-400">SMA({smaPeriod2}): {formatPrice(indicators.sma2[activeGlobalIndex]!)}</span>
              )}
              {showRsi && indicators.rsi[activeGlobalIndex] !== null && (
                <span className="text-indigo-400">RSI({rsiPeriod}): {indicators.rsi[activeGlobalIndex]!.toFixed(1)}</span>
              )}
              {showMacd && indicators.macd.histogram[activeGlobalIndex] !== null && (
                <span className="text-cyan-400">MACD: {indicators.macd.macdLine[activeGlobalIndex]?.toFixed(3)}</span>
              )}
            </div>
          </>
        ) : (
          <span className="text-slate-500">Awaiting Bitget candlestick stream...</span>
        )}
      </div>

      {/* Main Chart Canvas Area */}
      <div className="relative flex-1 bg-slate-950 p-2 overflow-hidden select-none">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
            <h3 className="text-sm font-semibold text-rose-300 mb-1">Bitget Candle Data Failed</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4 font-mono">{error}</p>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded hover:bg-rose-500/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Bitget Public Kline Feed
            </button>
          </div>
        ) : (!candles || candles.length === 0 || !scales || displayCandles.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-xs font-mono text-slate-400">Connecting to Bitget {symbol} {timeframe} stream...</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartWidth} ${totalHeight}`}
            className="w-full h-auto overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <clipPath id="priceAreaClip">
                <rect x={paddingLeft} y={paddingTop} width={scales.plotWidth} height={priceChartHeight - paddingTop - paddingBottom} />
              </clipPath>
            </defs>

            {/* Price Gridlines & Scale (Right Axis) */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const p = scales.minPrice + ratio * (scales.maxPrice - scales.minPrice);
              const y = scales.priceToPlotY(p);
              return (
                <g key={ratio}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="2 3"
                    strokeWidth="1"
                  />
                  <text
                    x={chartWidth - paddingRight + 6}
                    y={y + 3}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {formatPrice(p)}
                  </text>
                </g>
              );
            })}

            {/* Volume Bars at Bottom of Price Pane */}
            <g clipPath="url(#priceAreaClip)">
              {displayCandles.map((c, i) => {
                const x = scales.candleToX(i);
                const isBull = c.close >= c.open;
                const volY = scales.volumeToPlotY(c.volume);
                const baseVolY = priceChartHeight - paddingBottom;
                const barHeight = Math.max(1, baseVolY - volY);

                return (
                  <rect
                    key={`vol-${c.timestamp}`}
                    x={x - scales.bodyWidth / 2}
                    y={volY}
                    width={scales.bodyWidth}
                    height={barHeight}
                    fill={isBull ? '#10b981' : '#f43f5e'}
                    opacity={0.3}
                  />
                );
              })}
            </g>

            {/* Candlestick Wicks & Bodies */}
            <g clipPath="url(#priceAreaClip)">
              {displayCandles.map((c, i) => {
                const x = scales.candleToX(i);
                const isBull = c.close >= c.open;
                const highY = scales.priceToPlotY(c.high);
                const lowY = scales.priceToPlotY(c.low);
                const openY = scales.priceToPlotY(c.open);
                const closeY = scales.priceToPlotY(c.close);

                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));
                const color = isBull ? '#10b981' : '#f43f5e';

                return (
                  <g key={`candle-${c.timestamp}`}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke={color}
                      strokeWidth="1.2"
                    />
                    {/* Body */}
                    <rect
                      x={x - scales.bodyWidth / 2}
                      y={bodyTop}
                      width={scales.bodyWidth}
                      height={bodyHeight}
                      fill={color}
                      stroke={color}
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}
            </g>

            {/* SMA Lines */}
            {showSma && (
              <g clipPath="url(#priceAreaClip)">
                {/* SMA 1 (Fast, Amber) */}
                <path
                  d={buildSvgPath(
                    displayCandles.map((_, i) => {
                      const v = indicators.sma1[offsetIndex + i];
                      if (v === null || v === undefined) return null;
                      return { x: scales.candleToX(i), y: scales.priceToPlotY(v) };
                    })
                  )}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />

                {/* SMA 2 (Slow, Blue) */}
                <path
                  d={buildSvgPath(
                    displayCandles.map((_, i) => {
                      const v = indicators.sma2[offsetIndex + i];
                      if (v === null || v === undefined) return null;
                      return { x: scales.candleToX(i), y: scales.priceToPlotY(v) };
                    })
                  )}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* EMA Lines */}
            {showEma && (
              <g clipPath="url(#priceAreaClip)">
                {/* EMA 1 (Purple) */}
                <path
                  d={buildSvgPath(
                    displayCandles.map((_, i) => {
                      const v = indicators.ema1[offsetIndex + i];
                      if (v === null || v === undefined) return null;
                      return { x: scales.candleToX(i), y: scales.priceToPlotY(v) };
                    })
                  )}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                />

                {/* EMA 2 (Pink) */}
                <path
                  d={buildSvgPath(
                    displayCandles.map((_, i) => {
                      const v = indicators.ema2[offsetIndex + i];
                      if (v === null || v === undefined) return null;
                      return { x: scales.candleToX(i), y: scales.priceToPlotY(v) };
                    })
                  )}
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Time Axis Labels */}
            {displayCandles.map((c, i) => {
              if (i % Math.floor(displayCandles.length / 5) !== 0) return null;
              const x = scales.candleToX(i);
              const d = new Date(c.timestamp * 1000);
              const timeLabel = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

              return (
                <text
                  key={`time-${c.timestamp}`}
                  x={x}
                  y={priceChartHeight - paddingBottom + 16}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {timeLabel}
                </text>
              );
            })}

            {/* ============================================================== */}
            {/* RSI SUB-PANEL                                                  */}
            {/* ============================================================== */}
            {showRsi && (
              <g transform={`translate(0, ${priceChartHeight})`}>
                <line
                  x1={paddingLeft}
                  y1={0}
                  x2={chartWidth - paddingRight}
                  y2={0}
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Panel Label & current value */}
                <text
                  x={paddingLeft + 4}
                  y={14}
                  fill="#818cf8"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  RSI ({rsiPeriod})
                </text>

                {/* 70 Overbought & 30 Oversold Guidelines */}
                {[70, 50, 30].map((level) => {
                  const y = 80 - (level / 100) * 60;
                  return (
                    <g key={level}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke={level === 50 ? '#334155' : level === 70 ? '#f43f5e' : '#10b981'}
                        strokeDasharray={level === 50 ? '2 3' : '3 3'}
                        strokeWidth="0.8"
                        opacity={0.6}
                      />
                      <text
                        x={chartWidth - paddingRight + 6}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {level}
                      </text>
                    </g>
                  );
                })}

                {/* RSI Curve */}
                <path
                  d={buildSvgPath(
                    displayCandles.map((_, i) => {
                      const v = indicators.rsi[offsetIndex + i];
                      if (v === null || v === undefined) return null;
                      return { x: scales.candleToX(i), y: 80 - (v / 100) * 60 };
                    })
                  )}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* ============================================================== */}
            {/* MACD SUB-PANEL                                                 */}
            {/* ============================================================== */}
            {showMacd && (
              <g transform={`translate(0, ${priceChartHeight + rsiHeight})`}>
                <line
                  x1={paddingLeft}
                  y1={0}
                  x2={chartWidth - paddingRight}
                  y2={0}
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Panel Title */}
                <text
                  x={paddingLeft + 4}
                  y={14}
                  fill="#22d3ee"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  MACD ({macdFast},{macdSlow},{macdSignal})
                </text>

                {(() => {
                  // Find range of MACD values for scaling
                  let maxAbs = 0.0001;
                  displayCandles.forEach((_, i) => {
                    const gIdx = offsetIndex + i;
                    const m = indicators.macd.macdLine[gIdx];
                    const s = indicators.macd.signalLine[gIdx];
                    const h = indicators.macd.histogram[gIdx];
                    if (m !== null && Math.abs(m) > maxAbs) maxAbs = Math.abs(m);
                    if (s !== null && Math.abs(s) > maxAbs) maxAbs = Math.abs(s);
                    if (h !== null && Math.abs(h) > maxAbs) maxAbs = Math.abs(h);
                  });

                  const zeroY = 48;
                  const macdScaleY = (val: number) => zeroY - (val / (maxAbs * 1.25)) * 34;

                  return (
                    <>
                      {/* Zero line */}
                      <line
                        x1={paddingLeft}
                        y1={zeroY}
                        x2={chartWidth - paddingRight}
                        y2={zeroY}
                        stroke="#475569"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                      <text
                        x={chartWidth - paddingRight + 6}
                        y={zeroY + 3}
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        0.0
                      </text>

                      {/* Histogram Bars */}
                      {displayCandles.map((_, i) => {
                        const h = indicators.macd.histogram[offsetIndex + i];
                        if (h === null || h === undefined) return null;
                        const x = scales.candleToX(i);
                        const y = macdScaleY(h);
                        const hHeight = Math.max(1, Math.abs(y - zeroY));
                        const topY = h >= 0 ? y : zeroY;
                        return (
                          <rect
                            key={`hist-${i}`}
                            x={x - scales.bodyWidth / 2}
                            y={topY}
                            width={scales.bodyWidth}
                            height={hHeight}
                            fill={h >= 0 ? '#10b981' : '#f43f5e'}
                            opacity={0.7}
                          />
                        );
                      })}

                      {/* MACD Line (Cyan) */}
                      <path
                        d={buildSvgPath(
                          displayCandles.map((_, i) => {
                            const v = indicators.macd.macdLine[offsetIndex + i];
                            if (v === null || v === undefined) return null;
                            return { x: scales.candleToX(i), y: macdScaleY(v) };
                          })
                        )}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1.5"
                      />

                      {/* Signal Line (Orange) */}
                      <path
                        d={buildSvgPath(
                          displayCandles.map((_, i) => {
                            const v = indicators.macd.signalLine[offsetIndex + i];
                            if (v === null || v === undefined) return null;
                            return { x: scales.candleToX(i), y: macdScaleY(v) };
                          })
                        )}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="1.2"
                      />
                    </>
                  );
                })()}
              </g>
            )}

            {/* Vertical Crosshair Guide on Hover */}
            {hoverIndex !== null && (
              <line
                x1={scales.candleToX(hoverIndex)}
                y1={paddingTop}
                x2={scales.candleToX(hoverIndex)}
                y2={totalHeight - 8}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
                opacity={0.6}
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
};
