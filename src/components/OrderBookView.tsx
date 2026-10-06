import React from 'react';
import { AssetBadge } from './AssetBadge';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Clock,
  Layers,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { BitgetOrderBookState } from '../hooks/useBitgetMarketData';

interface OrderBookViewProps {
  symbol: string;
  orderBook: BitgetOrderBookState | null;
  isLoading: boolean;
  error: string | null;
  elapsedSec: number;
  isStale: boolean;
  onRetry: () => void;
}

export const OrderBookView: React.FC<OrderBookViewProps> = ({
  symbol,
  orderBook,
  isLoading,
  error,
  elapsedSec,
  isStale,
  onRetry,
}) => {
  const formatPrice = (val: number) => {
    if (val === undefined || isNaN(val)) return '--';
    if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return val.toFixed(2);
    if (val >= 0.01) return val.toFixed(4);
    return val.toFixed(6);
  };

  const formatSize = (val: number) => {
    if (val === undefined || isNaN(val)) return '--';
    if (val >= 10_000) return val.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (val >= 100) return val.toFixed(2);
    if (val >= 1) return val.toFixed(3);
    return val.toFixed(4);
  };

  // Base coin (e.g. SOL from SOLUSDT)
  const baseAsset = symbol.replace(/USDT|USDC|USD/g, '');

  // Calculate order book depth totals
  const totalBidDepth = orderBook?.bids[orderBook.bids.length - 1]?.total || 0;
  const totalAskDepth = orderBook?.asks[orderBook.asks.length - 1]?.total || 0;
  const totalVolume = totalBidDepth + totalAskDepth;
  const bidRatio = totalVolume > 0 ? (totalBidDepth / totalVolume) * 100 : 50;

  return (
    <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-xl overflow-hidden flex flex-col shadow-xl h-full">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-[#0c1222]/90 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400 shrink-0" />
          <AssetBadge
            symbol={symbol}
            size="sm"
            showLogo={true}
            showSource={true}
            showClassTag={true}
          />
        </div>

        {/* Freshness Badge & Refresh */}
        <div className="flex items-center gap-2">
          {isStale ? (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              STALE ({elapsedSec.toFixed(0)}s)
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              LIVE ({orderBook?.channel.toUpperCase() || 'WS'})
            </span>
          )}

          <button
            onClick={onRetry}
            disabled={isLoading}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh Order Book"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Source timestamp label */}
      <div className="px-4 py-1.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          {orderBook?.sourceLabel || `Bitget ${symbol} --:--:-- UTC`}
        </span>
        <span className="text-slate-500">Top 15 Levels</span>
      </div>

      {/* Main Order Book Content */}
      <div className="flex-1 flex flex-col justify-between p-2 font-mono text-xs overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center my-auto">
            <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
            <h4 className="text-xs font-semibold text-rose-300 mb-1">Order Book Unavailable</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mb-3">{error}</p>
            <button
              onClick={onRetry}
              className="px-2.5 py-1 text-xs font-medium bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded hover:bg-rose-500/30 transition-colors"
            >
              Retry Public Depth Feed
            </button>
          </div>
        ) : !orderBook ? (
          <div className="flex flex-col items-center justify-center py-16 text-center my-auto">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Streaming Bitget books15...</p>
          </div>
        ) : orderBook ? (
          <div className="flex flex-col h-full justify-between">
            {/* Table Column Headers */}
            <div className="grid grid-cols-3 px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800/50">
              <span className="text-left">Price (USDT)</span>
              <span className="text-right">Size ({baseAsset})</span>
              <span className="text-right">Total Depth</span>
            </div>

            {/* Asks (Sell Orders - Top 10-15, displayed reversed so lowest ask is closest to spread) */}
            <div className="flex flex-col-reverse justify-end overflow-hidden space-y-0.5 space-y-reverse py-1">
              {orderBook.asks.slice(0, 12).map((ask, idx) => (
                <div
                  key={`ask-${idx}-${ask.price}`}
                  className="relative grid grid-cols-3 px-2 py-0.5 text-[11px] hover:bg-slate-800/40 transition-colors group cursor-default"
                >
                  {/* Depth Bar Background (Rose) */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none transition-all duration-200"
                    style={{ width: `${ask.depthPct}%` }}
                  />
                  <span className="relative text-rose-400 font-semibold z-10 text-left">
                    {formatPrice(ask.price)}
                  </span>
                  <span className="relative text-slate-300 z-10 text-right">
                    {formatSize(ask.size)}
                  </span>
                  <span className="relative text-slate-500 z-10 text-right group-hover:text-slate-300">
                    {formatSize(ask.total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Spread Divider Bar */}
            <div className="my-1 py-1.5 px-3 bg-slate-950/90 border-y border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Mid:</span>
                <span className="text-slate-100 font-bold text-sm">
                  {formatPrice(orderBook.midPrice)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-500">Spread:</span>
                <span className="text-amber-400 font-medium">{orderBook.spread}</span>
                <span className="text-slate-500">({orderBook.spreadPct}%)</span>
              </div>
            </div>

            {/* Bids (Buy Orders - Top 10-15, descending) */}
            <div className="flex flex-col justify-start overflow-hidden space-y-0.5 py-1">
              {orderBook.bids.slice(0, 12).map((bid, idx) => (
                <div
                  key={`bid-${idx}-${bid.price}`}
                  className="relative grid grid-cols-3 px-2 py-0.5 text-[11px] hover:bg-slate-800/40 transition-colors group cursor-default"
                >
                  {/* Depth Bar Background (Emerald) */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none transition-all duration-200"
                    style={{ width: `${bid.depthPct}%` }}
                  />
                  <span className="relative text-emerald-400 font-semibold z-10 text-left">
                    {formatPrice(bid.price)}
                  </span>
                  <span className="relative text-slate-300 z-10 text-right">
                    {formatSize(bid.size)}
                  </span>
                  <span className="relative text-slate-500 z-10 text-right group-hover:text-slate-300">
                    {formatSize(bid.total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Depth Balance & Order Book Ratio Meter */}
            <div className="mt-2 pt-2 border-t border-slate-800/80 px-2 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-emerald-400 font-medium">
                  Bids: {formatSize(totalBidDepth)} {baseAsset} ({bidRatio.toFixed(1)}%)
                </span>
                <span className="text-rose-400 font-medium">
                  Asks: {formatSize(totalAskDepth)} {baseAsset} ({(100 - bidRatio).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-rose-500/30 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${bidRatio}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
