import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart2,
  Check,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Layers,
  LineChart,
  Plus,
  Radio,
  RefreshCw,
  Settings2,
  Shield,
  Sliders,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { TradingChart } from './TradingChart';
import { OrderBookView } from './OrderBookView';
import { CandleTimeframe, useBitgetMarketData } from '../hooks/useBitgetMarketData';
import { useWatchlist, WatchlistItem } from '../hooks/useWatchlist';
import { AddAssetModal } from './AddAssetModal';
import { AssetBadge, deduceAssetClass, getDisplayTicker } from './AssetBadge';

interface TradingChartToolsPanelProps {
  currentPair?: string;
  onSelectPair?: (pair: string) => void;
}

interface Ticker24hData {
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  quoteVolume: number;
  timestamp: number;
}

export const TradingChartToolsPanel: React.FC<TradingChartToolsPanelProps> = ({
  currentPair,
  onSelectPair,
}) => {
  // Watchlist with localStorage persistence
  const {
    watchlist,
    addAsset,
    removeAsset,
    moveAsset,
    resetToDefaults,
  } = useWatchlist();

  // Active selected symbol
  const [internalSymbol, setInternalSymbol] = useState<string>(() => {
    return currentPair || (watchlist.length > 0 ? watchlist[0].symbol : 'SOLUSDT');
  });

  const selectedSymbol = (currentPair || internalSymbol).replace(/[/-]/g, '').toUpperCase();

  // Sync external currentPair changes
  useEffect(() => {
    if (currentPair) {
      setInternalSymbol(currentPair.replace(/[/-]/g, '').toUpperCase());
    }
  }, [currentPair]);

  const handleSymbolChange = (sym: string) => {
    const clean = sym.replace(/[/-]/g, '').toUpperCase();
    setInternalSymbol(clean);
    if (onSelectPair) onSelectPair(clean);
  };

  const [timeframe, setTimeframe] = useState<CandleTimeframe>('5m');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Real Bitget market data hook (candlesticks + orderbook)
  const {
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
    retryCandles,
    retryOrderBook,
  } = useBitgetMarketData(selectedSymbol, timeframe);

  // 24h Ticker data state
  const [ticker, setTicker] = useState<Ticker24hData | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // Fetch 24h Ticker from Bitget proxy
  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch(`/api/bitget/proxy-tickers?symbol=${selectedSymbol}`);
      if (res.ok) {
        const json = await res.json();
        const dataArr = json.data;
        if (Array.isArray(dataArr) && dataArr.length > 0) {
          const t = dataArr[0];
          const newPrice = parseFloat(t.lastPr);
          const chg = parseFloat(t.change24h || '0') * 100;
          const hi = parseFloat(t.high24h || '0');
          const lo = parseFloat(t.low24h || '0');
          const vol = parseFloat(t.quoteVolume || t.usdtVolume || '0');

          if (!isNaN(newPrice) && newPrice > 0) {
            if (prevPriceRef.current && prevPriceRef.current !== newPrice) {
              setPriceFlash(newPrice > prevPriceRef.current ? 'up' : 'down');
              setTimeout(() => setPriceFlash(null), 800);
            }
            prevPriceRef.current = newPrice;

            setTicker({
              lastPrice: newPrice,
              change24h: chg,
              high24h: hi,
              low24h: lo,
              quoteVolume: vol,
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (err) {
      console.warn('[TradingChartToolsPanel] Ticker fetch error:', err);
    }
  }, [selectedSymbol]);

  // Poll ticker every 4 seconds
  useEffect(() => {
    fetchTicker();
    const interval = setInterval(fetchTicker, 4000);
    return () => clearInterval(interval);
  }, [fetchTicker]);

  // Derive latest price from ticker, order book, or latest candle
  const latestPrice =
    ticker?.lastPrice ||
    orderBook?.midPrice ||
    (candles.length > 0 ? candles[candles.length - 1].close : 0);

  const activeWatchlistItem = watchlist.find(
    (w) => w.symbol.replace(/[/-]/g, '').toUpperCase() === selectedSymbol
  );

  const activeAssetClass = activeWatchlistItem?.assetClass || deduceAssetClass(selectedSymbol);

  // Price formatting
  const formatPrice = (val?: number) => {
    if (!val || isNaN(val)) return '--';
    if (val >= 1000) return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return '$' + val.toFixed(2);
    if (val >= 0.01) return '$' + val.toFixed(4);
    return '$' + val.toFixed(6);
  };

  const formatVolume = (val?: number) => {
    if (!val || isNaN(val)) return '--';
    if (val >= 1_000_000_000) return '$' + (val / 1_000_000_000).toFixed(2) + 'B';
    if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(2) + 'M';
    if (val >= 1_000) return '$' + (val / 1_000).toFixed(1) + 'K';
    return '$' + val.toFixed(0);
  };

  return (
    <div className="space-y-4">
      {/* 1. Watchlist Strip with "+ Add asset" Button & Reorder/Remove support */}
      <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-xl p-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Watchlist
            </span>
            <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
              · 24/7 Market Feeds
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            {/* Watchlist Item Pills */}
            {watchlist.map((item) => {
              const isSelected = item.symbol.replace(/[/-]/g, '').toUpperCase() === selectedSymbol;
              return (
                <button
                  key={item.symbol}
                  onClick={() => handleSymbolChange(item.symbol)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-500 text-white font-bold shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40'
                      : 'bg-[#080d19] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <AssetBadge
                    symbol={item.symbol}
                    name={item.name}
                    assetClass={item.assetClass}
                    size="sm"
                    showLogo={true}
                    showSource={false}
                    showClassTag={true}
                  />
                </button>
              );
            })}

            {/* "+ Add asset" Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all shrink-0"
              title="Add pairs to watchlist (Crypto, Stock, CFD, Gold/Forex)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add asset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Unified Asset Header: Tags Everywhere, Live Price, 24h Metrics & Freshness */}
      <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Asset Identity with Mandated Tags: Ticker, Colored Class Tag, Bitget Source & Logo */}
          <div className="flex flex-wrap items-center gap-3">
            <AssetBadge
              symbol={selectedSymbol}
              name={activeWatchlistItem?.name}
              assetClass={activeAssetClass}
              size="lg"
              showLogo={true}
              showSource={true}
              showClassTag={true}
              showName={true}
            />

            {/* Staleness Guard Badge */}
            <div className="flex items-center gap-1.5">
              {isCandleStale ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  STALE ({candleElapsedSec.toFixed(0)}s)
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LIVE ({candleChannel.toUpperCase()})
                </span>
              )}
            </div>
          </div>

          {/* Prominent Live Price & 24h Statistics */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono">
            {/* Live Price with Flash Animation */}
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-black tracking-tight transition-colors duration-300 ${
                  priceFlash === 'up'
                    ? 'text-emerald-400 bg-emerald-500/10 px-1.5 rounded'
                    : priceFlash === 'down'
                    ? 'text-rose-400 bg-rose-500/10 px-1.5 rounded'
                    : 'text-white'
                }`}
              >
                {formatPrice(latestPrice)}
              </span>

              {/* 24h Return Badge */}
              {ticker && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold ${
                    ticker.change24h >= 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {ticker.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {ticker.change24h >= 0 ? '+' : ''}
                    {ticker.change24h.toFixed(2)}%
                  </span>
                </span>
              )}
            </div>

            {/* 24h High / Low / Volume */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 border-l border-slate-800 pl-4">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">24h High</span>
                <span className="text-slate-200 font-semibold">{formatPrice(ticker?.high24h)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">24h Low</span>
                <span className="text-slate-200 font-semibold">{formatPrice(ticker?.low24h)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">24h Volume</span>
                <span className="text-slate-200 font-semibold">{formatVolume(ticker?.quoteVolume)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Unified Asset View: Chart + Indicators + Order Book Together in One Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Candlestick Chart & Indicators Sub-panels (8 cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col">
          <TradingChart
            symbol={selectedSymbol}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            candles={candles}
            isLoading={candleLoading}
            error={candleError}
            lastUpdate={candleLastUpdate}
            isStale={isCandleStale}
            elapsedSec={candleElapsedSec}
            sourceLabel={candleSourceLabel}
            channel={candleChannel}
            onRetry={retryCandles}
          />
        </div>

        {/* Live Order Book & Depth View for Same Asset (4 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col">
          <OrderBookView
            symbol={selectedSymbol}
            orderBook={orderBook}
            isLoading={orderBookLoading}
            error={orderBookError}
            elapsedSec={orderBookElapsedSec}
            isStale={isOrderBookStale}
            onRetry={retryOrderBook}
          />
        </div>
      </div>

      {/* 4. Public Feed Metadata & Zero-Mock Guarantee Footer */}
      <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            {wsConnected ? 'Bitget Public WebSocket Active' : 'Connecting Bitget Public Feed'}
          </span>
          <span className="text-slate-600">·</span>
          <span>Feed: wss://ws.bitget.com/v2/ws/public</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>Candles: {candleChannel.toUpperCase()}</span>
          <span>·</span>
          <span>Depth: {orderBook?.channel.toUpperCase() || 'WS'} (books15)</span>
          <span>·</span>
          <span className="text-emerald-400/90 font-medium">No Mock Data Policy Enforced</span>
        </div>
      </div>

      {/* 5. Add Asset & Watchlist Management Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        watchlist={watchlist}
        onAddAsset={addAsset}
        onRemoveAsset={removeAsset}
        onMoveAsset={moveAsset}
        onResetDefaults={resetToDefaults}
        onSelectAsset={handleSymbolChange}
      />
    </div>
  );
};
