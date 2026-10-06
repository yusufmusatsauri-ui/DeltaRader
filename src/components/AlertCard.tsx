import React, { useState } from 'react';
import { AlertItem, HumanDecision } from '../types';
import { Zap, ExternalLink, HelpCircle, ArrowUpRight, Layers, Eye, Ban, Clock, CheckCircle2, ShieldAlert, BarChart2, ChevronDown, ChevronUp, Scale } from 'lucide-react';
import { BitgetChartCard } from './BitgetChartCard';
import { TradeIdeaCard } from './TradeIdeaCard';

interface AlertCardProps {
  alert: AlertItem;
  onOpenBreakdown: (alert: AlertItem) => void;
  onMakeDecision?: (alertId: string, symbol: string, decision: HumanDecision) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onOpenBreakdown, onMakeDecision }) => {
  const [showChart, setShowChart] = useState(false);
  const [showIdea, setShowIdea] = useState(true);
  const isPositive = alert.pct_move >= 0;
  const timeFormatted = new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Source attribution & price integrity
  const cleanSym = alert.symbol.replace(/[\/\-:]/g, '');
  const isBitget = alert.symbol.includes('USDT') || alert.source?.includes('Bitget');
  const fallbackLabel = alert.source?.startsWith('Fallback') ? alert.source : `Fallback: ${alert.source || 'Secondary Feed'}`;
  const sourceLabel = isBitget ? 'Bitget SPOT (Live Ticker Stream)' : fallbackLabel;
  const bitgetUrl = alert.bitget_url || `https://www.bitget.com/spot/${cleanSym}`;

  // Price Integrity String: e.g. "Bitget SOLUSDT 12:04:31 UTC" or "Fallback: NASDAQ Reference TSLA/USD 12:04:31 UTC"
  const priceSourceTag = alert.price_source_label || (
    isBitget
      ? `Bitget ${cleanSym} ${timeFormatted} UTC`
      : `${fallbackLabel} ${alert.symbol} ${timeFormatted} UTC`
  );

  // Confidence color grading
  let confBadgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
  if (alert.confidence >= 90) {
    confBadgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10 shadow-sm';
  } else if (alert.confidence >= 80) {
    confBadgeBg = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-cyan-500/10 shadow-sm';
  } else if (alert.confidence >= 70) {
    confBadgeBg = 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50';
  } else {
    confBadgeBg = 'bg-amber-950/80 text-amber-300 border-amber-500/50';
  }

  const decision = alert.human_decision || 'pending';

  // Session status and market open logic
  const sessionStatus = alert.session_status || (
    alert.asset_class === 'altcoin' ? '24/7 Crypto Open' :
    alert.asset_class === 'tokenized_stock' ? 'US Market Closed' :
    alert.symbol.includes('XAU') ? 'Gold Spot Open' : 'Global FX Open'
  );
  const isMarketOpen = alert.market_session_open ?? (!sessionStatus.toLowerCase().includes('closed'));
  const isOffHoursDrift = alert.off_hours_drift?.is_drift;
  const isQueued = alert.delivery_status === 'queued_quiet_hours';

  return (
    <div className={`bg-slate-900/90 border ${isQueued ? 'border-amber-800/60' : 'border-slate-800'} hover:border-slate-700 rounded-xl p-4.5 transition-all shadow-md hover:shadow-lg relative overflow-hidden group`}>
      {/* Staleness Guard Warning Banner */}
      {(alert.is_stale || alert.stale_warning) && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800 text-[11px] font-mono text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span>⚠️</span>
            <span className="font-bold">STALENESS GUARD TRIGGERED:</span>
            <span>{alert.stale_warning || 'Feed tick older than 10s. Live alerts suppressed.'}</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-900 border border-rose-700">FEED STALE</span>
        </div>
      )}

      {/* Quiet Hours Delivery Banner */}
      {isQueued && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] font-mono text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span>🌙</span>
            <span className="font-bold">QUIET HOURS QUEUED:</span>
            <span>{alert.queue_reason || `Score ${alert.confidence} < 75 threshold. Held for 08:00 Morning Digest.`}</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-700">HELD OVERNIGHT</span>
        </div>
      )}

      {/* Off-Hours Divergence Drift Banner */}
      {isOffHoursDrift && alert.off_hours_drift && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] font-mono text-rose-200 flex items-start gap-2">
          <span className="text-rose-400 font-bold shrink-0 text-sm">⚠️</span>
          <div>
            <div className="font-bold text-rose-300 flex items-center gap-1.5">
              <span>OFF-HOURS DIVERGENCE DRIFT DETECTED</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-900 text-rose-100 text-[10px]">
                {alert.off_hours_drift.drift_pct > 0 ? '+' : ''}{alert.off_hours_drift.drift_pct}% vs Last Close
              </span>
            </div>
            <div className="text-slate-300 text-[11px] mt-0.5">
              {alert.off_hours_drift.note || `Tokenized ${alert.symbol} trading at $${alert.price} while underlying cash market is closed ($${alert.off_hours_drift.last_close} last official close).`}
            </div>
          </div>
        </div>
      )}

      {/* Top Asset & Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-white">
            {alert.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-base text-white">{alert.symbol}</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {alert.asset_class.replace('_', ' ')}
              </span>

              {/* Session Awareness Badge: Open vs Closed */}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-semibold ${
                isMarketOpen
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                  : 'bg-rose-950/60 text-rose-300 border-rose-700/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {sessionStatus}
              </span>

              {/* Source attribution tag */}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isBitget
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
                  : 'bg-amber-950/60 text-amber-300 border-amber-700/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isBitget ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                {sourceLabel}
              </span>

              {/* Replay Mode Badge */}
              {alert.is_replay && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-600/60 flex items-center gap-1">
                  <span>🔁</span>
                  REPLAY
                </span>
              )}

              {decision !== 'pending' && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                  decision === 'watch'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    : decision === 'ignore'
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                }`}>
                  {decision === 'watch' ? '👁️ WATCHING' : decision === 'ignore' ? '❌ IGNORED' : '⏰ SNOOZED 1H'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-400 font-mono">{timeFormatted}</span>
              {!isMarketOpen && (
                <span className="text-[10px] text-amber-400/90 font-mono">
                  • Underlying cash market inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Confidence Score Pill */}
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 ${confBadgeBg}`}>
            <span>CONFIDENCE</span>
            <span className="text-sm font-extrabold">{alert.confidence}/100</span>
          </div>

          <button
            onClick={() => onOpenBreakdown(alert)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700 transition"
            title="Inspect Full Desk Research Brief & Audit"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Triggers Tag Row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {alert.triggers.map((trigger, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-800/50 flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            {trigger}
          </span>
        ))}
        {alert.divergence_note && alert.divergence_note !== 'None' && (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-800/50 flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-400" />
            Divergence Active
          </span>
        )}
      </div>

      {/* Numerical Stats Matrix */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-lg p-2.5 mb-3 border border-slate-800/70 font-mono text-xs">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Price & Move</span>
          <div className="flex items-center gap-1 font-bold text-slate-100">
            <span>${alert.price < 10 ? alert.price.toFixed(3) : alert.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={isPositive ? 'text-emerald-400 text-[11px]' : 'text-rose-400 text-[11px]'}>
              ({isPositive ? '+' : ''}{alert.pct_move.toFixed(2)}%)
            </span>
          </div>
          <span className="text-[9px] text-cyan-400/90 truncate block mt-0.5" title={priceSourceTag}>
            {priceSourceTag}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Volume vs Avg</span>
          <span className="font-bold text-amber-400">{alert.volume_vs_avg.toFixed(1)}x</span>
          <span className="text-[10px] text-slate-400 ml-1">(20-MA)</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Synergy Bonus</span>
          <span className="font-bold text-cyan-400">+{alert.breakdown.synergy_bonus} pts</span>
        </div>
      </div>

      {/* Divergence Detail if present */}
      {alert.divergence_note && alert.divergence_note !== 'None' && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-indigo-950/20 border border-indigo-800/30 text-[11px] text-indigo-200 font-mono flex items-center justify-between">
          <span className="truncate">🔀 <strong>Divergence:</strong> {alert.divergence_note}</span>
        </div>
      )}

      {/* 1-Line Why Summary */}
      <div className="bg-slate-950/40 rounded-lg p-3 border border-slate-800/60 mb-3">
        <div className="text-[11px] text-slate-400 flex items-start gap-2">
          <span className="text-amber-400 font-bold shrink-0 font-mono">💡 WHY:</span>
          <span className="text-slate-200 leading-relaxed">{alert.why_summary}</span>
        </div>
      </div>

      {/* Desk Brief Invalidation Pill (if brief available) */}
      {alert.brief && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-rose-950/20 border border-rose-900/30 text-[11px] text-rose-300/90 font-mono flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate"><strong>Invalidation:</strong> {alert.brief.invalidation}</span>
        </div>
      )}

      {/* Trade Idea Card (4b: Direction bias, Entry zone, Invalidation, Targets, RR, Change Mind) */}
      {showIdea && (
        <div className="mb-3">
          <TradeIdeaCard
            idea={alert.brief?.trade_idea}
            symbol={alert.symbol}
            price={alert.price}
            pctMove={alert.pct_move}
            keyLevels={alert.brief?.key_levels}
            invalidationText={alert.brief?.invalidation}
          />
        </div>
      )}

      {/* Inline Bitget Candlestick Chart (Collapsible / Expandable) */}
      {showChart && (
        <div className="mb-3">
          <BitgetChartCard
            symbol={alert.symbol}
            price={alert.price}
            pctMove={alert.pct_move}
            triggers={alert.triggers}
            keyLevels={alert.brief?.key_levels}
            source={sourceLabel}
            bitgetUrl={bitgetUrl}
            height={240}
            compact
          />
        </div>
      )}

      {/* Human Action Required Buttons (Research Desk Core Workflow) */}
      <div className="mb-3 bg-slate-950/50 rounded-lg p-2 border border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 font-semibold">Human Call:</span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">(Watch = Open Shadow Pos)</span>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button
            onClick={() => onMakeDecision && onMakeDecision(alert.id, alert.symbol, 'watch')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 transition ${
              decision === 'watch'
                ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-sm'
                : 'bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60'
            }`}
            title="Open hypothetical shadow position at current Bitget price with Idea targets & invalidation"
          >
            <Eye className="w-3 h-3" />
            <span>{decision === 'watch' ? 'Watching (Shadow Active)' : 'Watch'}</span>
          </button>

          <button
            onClick={() => onMakeDecision && onMakeDecision(alert.id, alert.symbol, 'ignore')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 transition ${
              decision === 'ignore'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Dismiss as non-actionable noise (Counterfactual tracked in shadow report)"
          >
            <Ban className="w-3 h-3" />
            Ignore
          </button>

          <button
            onClick={() => onMakeDecision && onMakeDecision(alert.id, alert.symbol, 'snooze_1h')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 transition ${
              decision === 'snooze_1h'
                ? 'bg-amber-600 text-white shadow-amber-500/20 shadow-sm'
                : 'bg-amber-950/50 hover:bg-amber-900 text-amber-300 border border-amber-800/60'
            }`}
            title="Snooze alerts for this asset for 1 hour"
          >
            <Clock className="w-3 h-3" />
            Snooze 1h
          </button>
        </div>
      </div>

      {/* Footer Actions, Bitget Chart Toggle & Market Link */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChart(!showChart)}
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] font-semibold transition"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{showChart ? 'Hide Bitget Chart' : 'View Bitget Chart'}</span>
            {showChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <a
            href={bitgetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-slate-300 hover:text-cyan-300 font-mono text-[11px] transition"
            title="Open pair on Bitget Spot exchange"
          >
            <span>Open on Bitget</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <button
          onClick={() => onOpenBreakdown(alert)}
          className="text-slate-400 hover:text-slate-200 text-[11px] font-mono flex items-center gap-1"
        >
          <span>Research Brief</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

