import React from 'react';
import { AlertItem, HumanDecision } from '../types';
import { X, HelpCircle, ShieldAlert, Zap, TrendingUp, Layers, CheckCircle2, AlertTriangle, ExternalLink, Eye, Ban, Clock, Compass, Target, BarChart2, Scale } from 'lucide-react';
import { BitgetChartCard } from './BitgetChartCard';
import { TradeIdeaCard } from './TradeIdeaCard';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
  onMakeDecision?: (alertId: string, symbol: string, decision: HumanDecision) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({ alert, onClose, onMakeDecision }) => {
  if (!alert) return null;

  const bd = alert.breakdown;
  const brief = alert.brief;
  const decision = alert.human_decision || 'pending';

  const cleanSym = alert.symbol.replace(/[\/\-:]/g, '');
  const isBitget = alert.symbol.includes('USDT') || alert.source?.includes('Bitget');
  const sourceLabel = alert.source || (isBitget ? 'Bitget (Direct WS/REST)' : 'Fallback Adapter');
  const bitgetUrl = alert.bitget_url || `https://www.bitget.com/spot/${cleanSym}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-mono text-white">
                {alert.symbol} Institutional Desk Brief
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 font-mono text-slate-300 uppercase">
                {alert.asset_class.replace('_', ' ')}
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isBitget
                  ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/50'
                  : 'bg-amber-950/70 text-amber-300 border-amber-700/50'
              }`}>
                {sourceLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Quantitative anomaly detection + orderflow catalyst synthesis for human decision-making
            </p>
          </div>
        </div>

        {/* Human Action Bar */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono font-bold text-slate-300 block">HUMAN CALL (RESEARCH DESK)</span>
            <span className="text-[11px] text-slate-500">Decide action; performance will be audited in Decision Journal:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMakeDecision && onMakeDecision(alert.id, alert.symbol, 'watch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                decision === 'watch'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-md'
                  : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Watch Alert
            </button>
            <button
              onClick={() => onMakeDecision && onMakeDecision(alert.id, alert.symbol, 'ignore')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                decision === 'ignore'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              Ignore (Noise)
            </button>
            <button
              onClick={() => onMakeDecision && onMakeDecision(alert.id, alert.symbol, 'snooze_1h')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                decision === 'snooze_1h'
                  ? 'bg-amber-600 text-white shadow-amber-500/20 shadow-md'
                  : 'bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Snooze 1h
            </button>
          </div>
        </div>

        {/* Live Candlestick Chart from Bitget */}
        <div className="mb-5">
          <BitgetChartCard
            symbol={alert.symbol}
            price={alert.price}
            pctMove={alert.pct_move}
            triggers={alert.triggers}
            keyLevels={brief?.key_levels}
            source={sourceLabel}
            bitgetUrl={bitgetUrl}
            height={260}
          />
        </div>

        {/* 4b. Trade Idea Card (Part of Every Desk Brief) */}
        <div className="mb-5">
          <TradeIdeaCard
            idea={brief?.trade_idea}
            symbol={alert.symbol}
            price={alert.price}
            pctMove={alert.pct_move}
            keyLevels={brief?.key_levels}
            invalidationText={brief?.invalidation}
          />
        </div>

        {/* 6 Core Desk Brief Sections */}
        <div className="space-y-4 mb-6">
          {/* 1. What Happened (Exact numbers) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              1. What Happened (Quantitative Numbers)
            </div>
            <p className="text-sm text-slate-200 font-mono">
              {brief?.what_happened || `Price moved ${alert.pct_move >= 0 ? '+' : ''}${alert.pct_move.toFixed(2)}% to $${alert.price} with volume at ${alert.volume_vs_avg.toFixed(1)}x over 20-MA.`}
            </p>
          </div>

          {/* 2. Likely Cause */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              2. Likely Cause (Headline-Linked or Catalyst Check)
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {brief?.likely_cause || alert.why_summary}
            </p>
          </div>

          {/* 3. Divergence Status */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              3. Divergence Status (Signature Engine)
            </div>
            <p className="text-sm text-slate-200 font-mono">
              {brief?.divergence_status || alert.divergence_note || 'No divergence detected; correlated with benchmark.'}
            </p>
          </div>

          {/* 4. Key Levels */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              4. Key Levels (Swing Levels &amp; S/R Zones)
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">SUPPORT</span>
                <span className="text-sm font-bold text-emerald-400">
                  ${brief?.key_levels?.support || (alert.price * 0.97).toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">BREAKOUT PIVOT</span>
                <span className="text-sm font-bold text-cyan-400">
                  ${brief?.key_levels?.breakout || (alert.price * 0.99).toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RESISTANCE</span>
                <span className="text-sm font-bold text-amber-400">
                  ${brief?.key_levels?.resistance || (alert.price * 1.03).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 5. What Would Invalidate This Read */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4">
            <div className="text-xs font-bold font-mono text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              5. Invalidation Condition
            </div>
            <p className="text-sm text-rose-200/90 leading-relaxed font-mono">
              {brief?.invalidation || `Bearish invalidation if price drops below $${(alert.price * 0.98).toFixed(2)} on high volume.`}
            </p>
          </div>

          {/* 6. Confidence Score Audit (0-100) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
                6. Confidence Score Audit ({bd.final_score}/100)
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {bd.final_score >= 80 ? 'HIGH CONVICTION' : 'MODERATE'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs mb-3">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">VOL SPIKE</span>
                <span className="font-bold text-amber-400">+{bd.volume_contribution} pts</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">BREAKOUT</span>
                <span className="font-bold text-cyan-400">+{bd.breakout_contribution} pts</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">DIVERGENCE</span>
                <span className="font-bold text-indigo-400">+{bd.divergence_contribution} pts</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">SYNERGY BONUS</span>
                <span className="font-bold text-emerald-400">+{bd.synergy_bonus} pts</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800 pt-2">
              <span>Base: {bd.base_score} pts | Synergy: +{bd.synergy_bonus} pts</span>
              <span>Penalties: -{bd.liquidity_penalty + bd.spread_penalty} pts</span>
            </div>
          </div>
        </div>

        {/* Disclaimer Warning */}
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-300 mb-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>DeltaRadar Human Decision Desk:</strong> This research brief is engineered solely for human decision enablement. DeltaRadar never places trades or automates executions.
          </span>
        </div>
      </div>
    </div>
  );
};
