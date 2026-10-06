import React from 'react';
import { RefreshCw, ArrowRightLeft, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { WatchlistAsset } from '../types';

interface DivergenceRadarProps {
  assets: WatchlistAsset[];
  onSelectSymbol: (symbol: string) => void;
}

export const DivergenceRadar: React.FC<DivergenceRadarProps> = ({ assets, onSelectSymbol }) => {
  const tokenizedAssets = assets.filter((a) => a.asset_class === 'tokenized_stock');
  const decoupledAlts = assets.filter((a) => a.asset_class === 'altcoin' && (a.divergence_pct && Math.abs(a.divergence_pct) > 3.0));
  const forexAssets = assets.filter((a) => a.asset_class === 'forex_gold');

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  DIVERGENCE ENGINE
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Signature Module
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Continuous multi-asset spread monitoring: Tokenized Equities vs NASDAQ & Altcoins vs BTC Benchmark.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">EQUITY SPREAD LIMIT</span>
              <span className="text-amber-400 font-bold">&gt; 1.20%</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">BTC DECOUPLING MIN</span>
              <span className="text-cyan-400 font-bold">&gt; 2.50%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Tokenized Stock vs NASDAQ Underlying */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100 font-mono">Tokenized Equities vs Underlying</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Threshold: ±1.20%</span>
          </div>

          <div className="space-y-4">
            {tokenizedAssets.map((asset) => {
              const spread = asset.divergence_pct || 0;
              const isBreached = Math.abs(spread) >= 1.2;
              const isPremium = spread > 0;
              
              return (
                <div
                  key={asset.symbol}
                  onClick={() => onSelectSymbol(asset.symbol)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer ${
                    isBreached
                      ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-100">{asset.symbol}</span>
                      <ArrowRightLeft className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-400 font-mono">{asset.benchmark_symbol}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-300">${asset.price.toFixed(2)}</span>
                      <span className="text-slate-500">vs</span>
                      <span className="text-slate-400">${asset.benchmark_price?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Spread Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-slate-400">Spread / Mispricing Delta</span>
                      <span
                        className={`font-bold ${
                          isBreached
                            ? isPremium
                              ? 'text-amber-400'
                              : 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {isPremium ? '+' : ''}{spread.toFixed(2)}%
                        {isBreached && (isPremium ? ' [PREMIUM LEAD]' : ' [DISCOUNT LAG]')}
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex relative">
                      <div className="w-1/2 flex justify-end pr-0.5">
                        {!isPremium && (
                          <div
                            className="h-full bg-rose-500 rounded-l"
                            style={{ width: `${Math.min(100, (Math.abs(spread) / 3.0) * 100)}%` }}
                          ></div>
                        )}
                      </div>
                      {/* Center zero line */}
                      <div className="w-0.5 h-full bg-slate-600"></div>
                      <div className="w-1/2 pl-0.5">
                        {isPremium && (
                          <div
                            className={`h-full rounded-r ${isBreached ? 'bg-amber-400' : 'bg-cyan-500'}`}
                            style={{ width: `${Math.min(100, (spread / 3.0) * 100)}%` }}
                          ></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isBreached && (
                    <div className="mt-2.5 pt-2 border-t border-amber-900/30 flex items-center justify-between text-[11px] text-amber-300">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Arbitrage opportunity / Tokenized leading NASDAQ underlying
                      </span>
                      <span className="font-semibold underline cursor-pointer">Generate Alert</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 2: Altcoin Decoupling vs BTC Benchmark */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100 font-mono">Altcoin Velocity Decoupling vs BTC</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">BTC Benchmark: $64,250 (-0.4%)</span>
          </div>

          <div className="space-y-4">
            {decoupledAlts.slice(0, 4).map((alt) => {
              const div = alt.divergence_pct || 0;
              const isPositive = div > 0;
              return (
                <div
                  key={alt.symbol}
                  onClick={() => onSelectSymbol(alt.symbol)}
                  className="p-3.5 rounded-lg border bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/40 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-100">{alt.symbol}</span>
                      <span className="text-xs text-slate-400">({alt.name})</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-300">${alt.price < 10 ? alt.price.toFixed(3) : alt.price.toFixed(2)}</span>
                      <span className={`font-semibold ${alt.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {alt.change_24h >= 0 ? '+' : ''}{alt.change_24h}%
                      </span>
                    </div>
                  </div>

                  {/* Relative Velocity bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-slate-400">Decoupling Spread vs BTC</span>
                      <span className={`font-bold ${isPositive ? 'text-cyan-300' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{div.toFixed(1)}% {isPositive ? 'Outperforming' : 'Lagging'}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          div > 8.0 ? 'bg-gradient-to-r from-cyan-500 to-indigo-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, (Math.abs(div) / 16.0) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-400">
                    <strong className="text-slate-300">Observation:</strong>{' '}
                    {div > 8.0
                      ? 'Aggressive capital rotation independent of Bitcoin macro direction.'
                      : 'Mild independent momentum with localized buy pressure.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
