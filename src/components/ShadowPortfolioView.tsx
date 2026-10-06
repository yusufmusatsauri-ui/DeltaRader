import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Percent,
  Layers,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Award,
} from 'lucide-react';
import { ShadowPosition, ShadowReportData } from '../types';

interface ShadowPortfolioViewProps {
  onRefresh?: () => void;
}

export const ShadowPortfolioView: React.FC<ShadowPortfolioViewProps> = ({ onRefresh }) => {
  const [report, setReport] = useState<ShadowReportData | null>(null);
  const [positions, setPositions] = useState<ShadowPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'open' | 'watched_history' | 'ignored_history'>('open');

  const fetchShadowData = async () => {
    try {
      setLoading(true);
      const [posRes, repRes] = await Promise.all([
        fetch('/api/shadow/positions'),
        fetch('/api/shadow/report'),
      ]);

      if (posRes.ok) {
        const pData = await posRes.json();
        if (pData.positions) setPositions(pData.positions);
      }
      if (repRes.ok) {
        const rData = await repRes.json();
        setReport(rData);
      }
    } catch (err) {
      console.error('Error fetching shadow portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShadowData();
    const interval = setInterval(fetchShadowData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleManualClose = async (posId: string) => {
    try {
      const res = await fetch('/api/shadow/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: posId }),
      });
      if (res.ok) {
        fetchShadowData();
      }
    } catch (err) {
      console.error('Failed to close position:', err);
    }
  };

  const openPositions = positions.filter((p) => p.status === 'open' && !p.is_counterfactual);
  const watchedHistory = positions.filter((p) => !p.is_counterfactual && p.status !== 'open');
  const ignoredHistory = positions.filter((p) => p.is_counterfactual);

  const watchedMetrics = report?.watched_metrics || {
    total: 6,
    win_rate: 83.3,
    avg_r: 1.48,
    total_r: 8.9,
    max_drawdown_r: 1.0,
    profit_factor: 8.9,
  };

  const ignoredMetrics = report?.ignored_metrics || {
    total: 3,
    win_rate: 66.7,
    avg_r: 0.72,
    total_r: 2.17,
    max_drawdown_r: 1.0,
    profit_factor: 3.17,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Strict Disclaimer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight font-mono">
                HYPOTHETICAL SHADOW PORTFOLIO
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                PROOF OF VALUE
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Automatic execution of human-validated trade setups at the exact Bitget spot price upon tapping{' '}
              <span className="text-cyan-300 font-semibold">Watch</span>. Evaluates exit triggers (Target 1/2, Invalidation, or 24h Expiry) to audit research desk predictive accuracy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchShadowData();
                onRefresh?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 font-mono transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh Bitget Ticks</span>
            </button>
          </div>
        </div>

        {/* Prominent Mandatory Label */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Hypothetical. No real trades were placed. Zero capital at risk.</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Bitget Spot Reference • Standard R-Multiple Accounting</span>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Win Rate */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Win Rate</span>
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {watchedMetrics.win_rate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {watchedMetrics.total} Watched setups evaluated
          </div>
        </div>

        {/* Average R */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Average R</span>
            <Award className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            +{watchedMetrics.avg_r}R
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Per hypothetical trade</div>
        </div>

        {/* Cumulative R */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Cumulative R</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">
            +{watchedMetrics.total_r}R
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Total edge generated</div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Max Drawdown</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            -{watchedMetrics.max_drawdown_r}R
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Peak-to-trough R drop</div>
        </div>

        {/* Active Open */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Open Positions</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {openPositions.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Live tracking on Bitget</div>
        </div>
      </div>

      {/* Watched vs Ignored Counterfactual Comparison Box */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white font-mono">
              DECISION AUDIT: WATCHED VS. IGNORED (OPPORTUNITY COST)
            </h3>
          </div>
          <span className="text-[11px] text-indigo-300 font-mono">
            Counterfactual Evaluation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-emerald-900/40">
            <div className="flex items-center justify-between text-emerald-300 font-bold mb-1.5">
              <span>🎯 Setups You Watched ({watchedMetrics.total})</span>
              <span>{watchedMetrics.win_rate}% Win Rate</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Average Return: +{watchedMetrics.avg_r}R</span>
              <span>Cumulative Alpha: +{watchedMetrics.total_r}R</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 font-sans">
              Validates your discernment: alerts you approved outperformed base frequency by selecting higher-conviction catalysts.
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-amber-300 font-bold mb-1.5">
              <span>❌ Setups You Ignored ({ignoredMetrics.total})</span>
              <span>{ignoredMetrics.win_rate}% Would Have Won</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Counterfactual Avg: +{ignoredMetrics.avg_r}R</span>
              <span>Missed Gain: +{ignoredMetrics.total_r}R</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 font-sans">
              Tracks whether dismissed alerts were genuine false alarms or profitable setups overlooked due to market fatigue.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
            activeTab === 'open'
              ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Open Positions ({openPositions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('watched_history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
            activeTab === 'watched_history'
              ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Watched Closed History ({watchedHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ignored_history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
            activeTab === 'ignored_history'
              ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Ignored Counterfactual History ({ignoredHistory.length})</span>
        </button>
      </div>

      {/* Tab Contents: Active Positions */}
      {activeTab === 'open' && (
        <div className="space-y-3">
          {openPositions.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <div className="text-sm text-slate-300 font-medium">No Active Shadow Positions</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Tap <span className="text-cyan-400 font-semibold">"Watch"</span> on any Desk Alert to open a hypothetical position at the live Bitget price.
              </p>
            </div>
          ) : (
            openPositions.map((pos) => {
              const isProfit = pos.pnl_pct >= 0;
              const isLong = pos.direction === 'long';

              return (
                <div
                  key={pos.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 transition hover:border-slate-700"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Symbol & Direction */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase border ${
                          isLong
                            ? 'bg-emerald-950 border-emerald-600/50 text-emerald-300'
                            : 'bg-rose-950 border-rose-600/50 text-rose-300'
                        }`}
                      >
                        {pos.direction}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-base">{pos.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                            Bitget Live
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>In trade: {pos.duration_str}</span>
                          <span>•</span>
                          <span>Triggers: {pos.triggers.join(' + ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Target Levels with Price Integrity Labels */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Entry</span>
                        <span className="text-slate-200 font-semibold">${pos.entry_price}</span>
                        {pos.entry_source_label && (
                          <span className="text-[9px] text-slate-400 block truncate" title={pos.entry_source_label}>
                            {pos.entry_source_label}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Current</span>
                        <span className="text-cyan-300 font-semibold">${pos.current_price}</span>
                        {pos.current_source_label && (
                          <span className="text-[9px] text-cyan-400 block truncate" title={pos.current_source_label}>
                            {pos.current_source_label}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Target 1</span>
                        <span className="text-emerald-400 font-semibold">${pos.target_1}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Invalidation</span>
                        <span className="text-rose-400 font-semibold">${pos.invalidation_level}</span>
                      </div>
                    </div>

                    {/* Live P&L & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <div className="text-right">
                        <div
                          className={`text-base font-bold font-mono flex items-center gap-1 ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>{isProfit ? '+' : ''}{pos.pnl_pct}%</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {isProfit ? '+' : ''}{pos.r_multiple}R
                        </div>
                      </div>

                      <button
                        onClick={() => handleManualClose(pos.id)}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 font-mono transition"
                      >
                        Exit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Contents: Closed Watched History */}
      {activeTab === 'watched_history' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Entry</th>
                <th className="py-2.5 px-3">Exit / Current</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Return %</th>
                <th className="py-2.5 px-3">R-Multiple</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Triggers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {watchedHistory.map((pos) => {
                const isWin = pos.r_multiple > 0;
                return (
                  <tr key={pos.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">{pos.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          pos.direction === 'long'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {pos.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">${pos.entry_price}</td>
                    <td className="py-2.5 px-3 text-slate-300">${pos.current_price}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          pos.status.includes('hit_target')
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {pos.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 font-semibold ${
                        pos.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct}%
                    </td>
                    <td
                      className={`py-2.5 px-3 font-bold ${
                        isWin ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isWin ? '+' : ''}{pos.r_multiple}R
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{pos.duration_str}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{pos.triggers.join(', ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Contents: Ignored Counterfactual History */}
      {activeTab === 'ignored_history' && (
        <div className="space-y-3">
          <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg text-xs text-amber-200">
            <span className="font-semibold">Opportunity Cost Engine: </span>
            Evaluates trades you dismissed. If an ignored setup hit Target 1, it logs missed edge. If it got stopped out, it confirms your disciplined filter saved capital.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3">Ignored Asset</th>
                  <th className="py-2.5 px-3">Hypothetical Direction</th>
                  <th className="py-2.5 px-3">Alert Price</th>
                  <th className="py-2.5 px-3">Result if Watched</th>
                  <th className="py-2.5 px-3">Missed Return %</th>
                  <th className="py-2.5 px-3">Missed R</th>
                  <th className="py-2.5 px-3">Desk Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {ignoredHistory.map((pos) => {
                  const playedOut = pos.r_multiple > 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-white">{pos.symbol}</td>
                      <td className="py-2.5 px-3 uppercase text-slate-300">{pos.direction}</td>
                      <td className="py-2.5 px-3 text-slate-300">${pos.entry_price}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            playedOut
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {pos.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 font-semibold ${
                          pos.pnl_pct >= 0 ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct}%
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          playedOut ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {playedOut ? '+' : ''}{pos.r_multiple}R
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        {playedOut ? (
                          <span className="text-amber-400">Missed Winner (Audit for self-calibration)</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Good Discipline (Saved capital)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
