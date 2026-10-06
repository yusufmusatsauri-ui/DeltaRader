import React from 'react';
import { TrendingUp, TrendingDown, Zap, Coins } from 'lucide-react';
import { WatchlistAsset } from '../types';

interface TickerBarProps {
  assets: WatchlistAsset[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const TickerBar: React.FC<TickerBarProps> = ({ assets, selectedSymbol, onSelectSymbol }) => {
  return (
    <div className="bg-slate-950/80 border-b border-slate-800/80 py-2 px-4 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-2.5 min-w-max">
        <div className="flex items-center gap-1.5 pr-2 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono border-r border-slate-800">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <Coins className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-300">Bitget Live:</span>
        </div>

        {assets.map((asset) => {
          const isSelected = selectedSymbol === asset.symbol;
          const isPositive = asset.change_24h >= 0;
          const isBitget = asset.symbol.includes('USDT') || asset.asset_class === 'altcoin';

          return (
            <div
              key={asset.symbol}
              onClick={() => onSelectSymbol(asset.symbol)}
              title={asset.price_source_label || (isBitget ? `Bitget ${asset.symbol.replace(/[\/\-:]/g, '')}` : `Fallback: ${asset.source || 'Secondary Feed'}`)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs cursor-pointer transition border ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="font-mono font-semibold">{asset.symbol}</span>
                <span className={`text-[9px] px-1 rounded font-mono ${
                  asset.is_stale
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : isBitget
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {asset.is_stale ? 'STALE' : isBitget ? 'Bitget' : 'Fallback'}
                </span>
                {asset.is_anomaly && (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                )}
              </div>

              <span className="font-mono text-slate-200">
                ${asset.price < 10 ? asset.price.toFixed(3) : asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>

              <span
                className={`flex items-center text-[11px] font-mono font-medium ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {isPositive ? '+' : ''}{asset.change_24h.toFixed(1)}%
              </span>

              {asset.volume_ratio >= 3.0 && (
                <span className="flex items-center text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                  {asset.volume_ratio}x
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
