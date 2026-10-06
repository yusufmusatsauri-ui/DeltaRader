import React from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, Target, AlertOctagon, Scale, HelpCircle } from 'lucide-react';
import { TradeIdea } from '../types';

interface TradeIdeaCardProps {
  idea?: TradeIdea;
  symbol: string;
  price: number;
  pctMove: number;
  keyLevels?: {
    breakout: number;
    support: number;
    resistance: number;
  };
  invalidationText?: string;
}

export const TradeIdeaCard: React.FC<TradeIdeaCardProps> = ({
  idea,
  symbol,
  price,
  pctMove,
  keyLevels,
  invalidationText,
}) => {
  // If idea is not explicitly provided, synthesize deterministic levels from keyLevels
  const isBullish = pctMove >= 0;
  const direction = idea?.direction || (isBullish ? 'long' : 'short');
  const digits = price < 5 ? 4 : 2;

  const support = keyLevels?.support ?? +(price * 0.975).toFixed(digits);
  const resistance = keyLevels?.resistance ?? +(price * 1.035).toFixed(digits);

  const entryZone = idea?.entry_zone || `$${(price * 0.997).toFixed(digits)} - $${(price * 1.003).toFixed(digits)}`;
  const invalidationLevel = idea?.invalidation_level ?? (direction === 'long' ? +(support * 0.995).toFixed(digits) : +(resistance * 1.005).toFixed(digits));
  const target1 = idea?.target_1 ?? (direction === 'long' ? +(resistance).toFixed(digits) : +(support).toFixed(digits));
  const target2 = idea?.target_2 ?? (direction === 'long' ? +(target1 * 1.03).toFixed(digits) : +(target1 * 0.97).toFixed(digits));

  const risk = Math.max(Math.abs(price - invalidationLevel), price * 0.005);
  const reward = Math.abs(target1 - price);
  const rrRatio = idea?.reward_risk_ratio ?? +(reward / risk).toFixed(2);

  const changeMind = idea?.change_mind_condition || invalidationText || (
    direction === 'long'
      ? `5m candle close below $${invalidationLevel} with >2x volume or BTC rejecting reference resistance.`
      : `5m candle close above $${invalidationLevel} on sustained buy volume.`
  );

  const isLong = direction === 'long';

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3.5 shadow-sm space-y-3">
      {/* Header & Direction Bias */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/20 text-amber-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200 tracking-wide flex items-center gap-1.5">
              <span>TRADE IDEA</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                HUMAN REVIEW ONLY
              </span>
            </div>
          </div>
        </div>

        {/* Direction Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider uppercase border ${
            isLong
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
          }`}
        >
          {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>BIAS: {direction.toUpperCase()}</span>
        </div>
      </div>

      {/* Numerical Setup Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {/* Entry Zone */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-[10px] uppercase text-slate-400 block font-sans">Entry Zone</span>
          <span className="font-semibold text-cyan-300 text-xs mt-0.5 block">{entryZone}</span>
        </div>

        {/* Invalidation Level */}
        <div className="bg-slate-950/60 p-2 rounded border border-rose-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-rose-400 block font-sans">Invalidation</span>
            <AlertOctagon className="w-3 h-3 text-rose-400" />
          </div>
          <span className="font-semibold text-rose-300 text-xs mt-0.5 block">${invalidationLevel}</span>
        </div>

        {/* Target 1 & Target 2 */}
        <div className="bg-slate-950/60 p-2 rounded border border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-emerald-400 block font-sans">Targets</span>
            <Target className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-xs font-semibold text-emerald-300 mt-0.5">
            <span>T1: ${target1}</span>
            {target2 && <span className="text-emerald-400/70 text-[10px] ml-1.5 font-normal">| T2: ${target2}</span>}
          </div>
        </div>

        {/* Reward to Risk Ratio */}
        <div className="bg-slate-950/60 p-2 rounded border border-indigo-900/40">
          <span className="text-[10px] uppercase text-indigo-400 block font-sans">Reward-to-Risk</span>
          <span className="font-semibold text-indigo-300 text-xs mt-0.5 block">{rrRatio} : 1</span>
        </div>
      </div>

      {/* What would change my mind */}
      <div className="bg-slate-950/70 border border-slate-800 rounded p-2.5 flex items-start gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="text-slate-400 font-medium">What would change my mind: </span>
          <span className="text-slate-200">{changeMind}</span>
        </div>
      </div>

      {/* Non-negotiable Disclaimer Banner */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-amber-400/90 font-medium">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Idea for human review. Not an order, not advice.</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">No leverage • No position sizing</span>
      </div>
    </div>
  );
};
