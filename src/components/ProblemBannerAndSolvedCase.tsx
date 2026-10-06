import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Database,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Layers,
  LineChart,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { AssetBadge } from './AssetBadge';

export interface OutcomeRecord {
  alert_id: string;
  symbol: string;
  pair?: string;
  clean_pair?: string;
  asset_class: string;
  direction: 'bullish' | 'bearish';
  alert_timestamp: number;
  alert_price: number;
  price_1h?: number | null;
  move_pct_1h?: number | null;
  hit_1h?: number | boolean | null;
  price_4h?: number | null;
  move_pct_4h?: number | null;
  hit_4h?: number | boolean | null;
  price_24h?: number | null;
  move_pct_24h?: number | null;
  hit_24h?: number | boolean | null;
  triggers: string[] | string;
  confidence: number;
  resolved: number | boolean;
  why_summary?: string;
  is_replay?: boolean;
  is_graded?: boolean;
  time_fired_utc?: string;
  time_only_utc?: string;
  source_label?: string;
  verdict?: string;
  hit_status?: 'hit' | 'miss' | 'in_progress';
  trigger_type_str?: string;
  cause_summary?: string;
}

interface ProblemBannerAndSolvedCaseProps {
  onSelectPairForChart?: (pair: string) => void;
  hideProblemBanner?: boolean;
}

export const ProblemBannerAndSolvedCase: React.FC<ProblemBannerAndSolvedCaseProps> = ({
  onSelectPairForChart,
  hideProblemBanner = false,
}) => {
  // Problem Banner collapsible state
  const [isBannerCollapsed, setIsBannerCollapsed] = useState<boolean>(false);

  // Outcomes & Alerts log state
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Fetch outcomes from real SQLite alert log (/api/outcomes)
  const fetchOutcomes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/outcomes');
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.outcomes)) {
        setOutcomes(data.outcomes);
        setLastFetched(Date.now());
      } else {
        throw new Error(data.error || 'Failed to retrieve outcomes from server log');
      }
    } catch (err: any) {
      console.warn('[ProblemBanner] Failed to fetch outcomes:', err.message);
      setError(err.message || 'Unable to connect to outcomes database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutcomes();
    // Poll every 30 seconds to capture any newly graded alerts
    const interval = setInterval(fetchOutcomes, 30000);
    return () => clearInterval(interval);
  }, [fetchOutcomes]);

  // Find the most recent graded alert, or selected one
  const gradedOutcomes = outcomes.filter((o) => o.is_graded);
  const solvedCase: OutcomeRecord | undefined = selectedAlertId
    ? outcomes.find((o) => o.alert_id === selectedAlertId)
    : gradedOutcomes.length > 0
    ? gradedOutcomes[0]
    : undefined;

  // Format price helper
  const formatPrice = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '--';
    if (val >= 1000) return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return '$' + val.toFixed(2);
    return '$' + val.toFixed(4);
  };

  // Format percent helper
  const formatPct = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '--';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  };

  const handleViewOnChart = (record?: OutcomeRecord) => {
    if (!record || !onSelectPairForChart) return;
    const targetSymbol = record.clean_pair || record.symbol.replace(/[/-]/g, '').toUpperCase();
    onSelectPairForChart(targetSymbol);
  };

  return (
    <div className="space-y-4">
      {/* 1. Problem Banner (Only rendered if not hidden by top layout) */}
      {!hideProblemBanner && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all">
          {/* Banner Header with Collapsible Toggle */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-blue-400 uppercase">
                    System Mandate
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Bitget 24/7
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight mt-0.5">
                  The Problem
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
                aria-label={isBannerCollapsed ? 'Expand Problem Banner' : 'Collapse Problem Banner'}
              >
                <span>{isBannerCollapsed ? 'Expand' : 'Collapse'}</span>
                {isBannerCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Body Content */}
          {!isBannerCollapsed && (
            <div className="p-4 sm:p-5 space-y-3 bg-slate-950/40">
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
                Built for retail traders with moderate risk appetite trading part-time alongside another career ($1k–$50k capital), taking swing and short-term setups across altcoins, tokenized equities, and gold/forex via CFDs.
              </p>
              <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0 shadow-sm shadow-blue-500/50" />
                <p className="text-xs sm:text-sm text-blue-300 font-mono font-medium leading-relaxed">
                  DeltaRadar fills the middle between silent charting and black-box bots: context-rich, explainable alerts with an auditable track record, while the human stays in control of every trade decision. DeltaRadar never places trades — it is a research desk, not an execution engine.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pre-Launch Validation Framework & Target Metrics Dashboard */}
      <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-xl p-5 shadow-lg space-y-4 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight">
              Pre-Launch Validation Framework &amp; Shadow Portfolio
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/40 font-semibold uppercase">
              Build Stage
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Real Bitget Market Stream · Zero Execution Risk
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          DeltaRadar is pre-launch; the figures below reflect the current build stage, not live trading history. DeltaRadar places no trades. Its core performance metric is <strong className="text-white">alert accuracy</strong>, shown transparently through the <strong className="text-blue-400">shadow portfolio</strong> (hypothetical positions opened only when the human taps Watch), not real P&amp;L.
        </p>

        {/* 4-Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Test Period */}
          <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              1. Test Period
            </span>
            <span className="text-sm font-bold font-mono text-white block">
              Targeted [X]-Day Run
            </span>
            <p className="text-[11px] text-slate-400 leading-normal">
              Continuous live run on Bitget data once the anomaly engine and outcome grading are fully deployed.
            </p>
          </div>

          {/* 2. Win Rate / Validation Plan */}
          <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              2. Win Rate / Hit Rate
            </span>
            <span className="text-sm font-bold font-mono text-white block">
              Auto-Graded (+1h, +4h, +24h)
            </span>
            <p className="text-[11px] text-slate-400 leading-normal">
              Every alert logged with trigger type, confidence score, and human decision. Trigger weights recalibrate weekly.
            </p>
          </div>

          {/* 3. Returns & Risk Metrics */}
          <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              3. Returns / Sharpe / Drawdown
            </span>
            <span className="text-sm font-bold font-mono text-white block">
              Not Applicable (No Trades)
            </span>
            <p className="text-[11px] text-slate-400 leading-normal">
              Costs: none ($0 capital deployed). Accuracy measured strictly on Watched alerts via Shadow Portfolio.
            </p>
          </div>

          {/* 4. Activation & Distribution Proof */}
          <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              4. Activation &amp; Distribution
            </span>
            <span className="text-sm font-bold font-mono text-white block">
              Watch/Ignore Ratio &amp; Retention
            </span>
            <p className="text-[11px] text-slate-400 leading-normal">
              Tracked via alerts/day, command usage, weekly active Telegram users, and Watched-to-Ignored trust progression.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Solved Case Card */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Card Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight">
                  Problem Solved: Real Example
                </h3>
                {solvedCase?.is_replay && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-wider">
                    REPLAY
                  </span>
                )}
                {solvedCase?.hit_status === 'hit' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    HIT
                  </span>
                )}
                {solvedCase?.hit_status === 'miss' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    MISS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Populated from live SQLite alert log · Real Bitget market data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOutcomes}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors"
              title="Refresh SQLite outcome data"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {solvedCase && (
              <button
                onClick={() => handleViewOnChart(solvedCase)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>View on chart</span>
              </button>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5">
          {loading && outcomes.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Loading logged Bitget alert outcomes...</span>
            </div>
          ) : error && outcomes.length === 0 ? (
            <div className="py-6 px-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : !solvedCase ? (
            <div className="py-8 px-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center font-mono space-y-2">
              <Clock className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                No solved case yet. Waiting for the first graded alert.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                DeltaRadar requires +1h, +4h, and +24h to record real post-alert price movement against Bitget before grading outcomes.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Top Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Pair */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider mb-1.5">
                    Pair
                  </span>
                  <AssetBadge
                    symbol={solvedCase.symbol}
                    assetClass={solvedCase.asset_class}
                    size="md"
                    showLogo={true}
                    showSource={true}
                    showClassTag={true}
                  />
                </div>

                {/* Trigger Type */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">
                    Trigger Type
                  </span>
                  <p className="text-xs font-semibold font-mono text-amber-400 mt-1 line-clamp-1" title={solvedCase.trigger_type_str}>
                    {solvedCase.trigger_type_str || 'Anomaly Triggered'}
                  </p>
                </div>

                {/* Time Alert Fired */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">
                    Time Alert Fired
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-200 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{solvedCase.time_fired_utc || 'UTC Timestamp'}</span>
                  </div>
                </div>

                {/* Price at Alert + Source */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">
                    Price at Alert
                  </span>
                  <div className="mt-1">
                    <span className="text-base font-bold font-mono text-white">
                      {formatPrice(solvedCase.alert_price)}
                    </span>
                    <span className="block text-[10px] font-mono text-slate-400 truncate mt-0.5" title={solvedCase.source_label}>
                      source: {solvedCase.source_label || `Bitget ${solvedCase.symbol} ${solvedCase.time_only_utc}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cause Summary */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">
                  Cause Summary
                </span>
                <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
                  {solvedCase.cause_summary || solvedCase.why_summary || 'Anomaly detected across Bitget volume and price metrics.'}
                </p>
              </div>

              {/* Price Move After Alert at +1h / +4h / +24h */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="uppercase tracking-wider">
                    Price Move After Alert (+1h / +4h / +24h)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Direction: <strong className="text-slate-300 uppercase">{solvedCase.direction}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  {/* +1h Horizon */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">+1h Horizon</span>
                      {solvedCase.hit_1h === 1 || solvedCase.hit_1h === true ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> HIT
                        </span>
                      ) : solvedCase.hit_1h === 0 || solvedCase.hit_1h === false ? (
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> MISS
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">PENDING</span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-sm font-bold text-slate-200">
                        {formatPrice(solvedCase.price_1h)}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          solvedCase.move_pct_1h !== null && solvedCase.move_pct_1h !== undefined
                            ? solvedCase.move_pct_1h > 0
                              ? 'text-emerald-400'
                              : solvedCase.move_pct_1h < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {formatPct(solvedCase.move_pct_1h)}
                      </span>
                    </div>
                  </div>

                  {/* +4h Horizon */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">+4h Horizon</span>
                      {solvedCase.hit_4h === 1 || solvedCase.hit_4h === true ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> HIT
                        </span>
                      ) : solvedCase.hit_4h === 0 || solvedCase.hit_4h === false ? (
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> MISS
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">PENDING</span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-sm font-bold text-slate-200">
                        {formatPrice(solvedCase.price_4h)}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          solvedCase.move_pct_4h !== null && solvedCase.move_pct_4h !== undefined
                            ? solvedCase.move_pct_4h > 0
                              ? 'text-emerald-400'
                              : solvedCase.move_pct_4h < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {formatPct(solvedCase.move_pct_4h)}
                      </span>
                    </div>
                  </div>

                  {/* +24h Horizon */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">+24h Horizon</span>
                      {solvedCase.hit_24h === 1 || solvedCase.hit_24h === true ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> HIT
                        </span>
                      ) : solvedCase.hit_24h === 0 || solvedCase.hit_24h === false ? (
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> MISS
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">PENDING</span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-sm font-bold text-slate-200">
                        {formatPrice(solvedCase.price_24h)}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          solvedCase.move_pct_24h !== null && solvedCase.move_pct_24h !== undefined
                            ? solvedCase.move_pct_24h > 0
                              ? 'text-emerald-400'
                              : solvedCase.move_pct_24h < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {formatPct(solvedCase.move_pct_24h)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plain Verdict Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono ${
                  solvedCase.hit_status === 'hit'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : solvedCase.hit_status === 'miss'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {solvedCase.hit_status === 'hit' ? (
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : solvedCase.hit_status === 'miss' ? (
                    <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                      <XCircle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                      Plain Verdict
                    </span>
                    <span className="text-base sm:text-lg font-bold tracking-tight">
                      {solvedCase.verdict || (solvedCase.hit_status === 'hit' ? 'Alert preceded a significant move' : 'Alert did not play out')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleViewOnChart(solvedCase)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold bg-white text-slate-950 hover:bg-slate-200 transition-colors shadow-sm self-start sm:self-auto"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>View on chart</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Honesty Rules: Recent alerts list with hit/miss results beneath the card */}
        <div className="border-t border-slate-800 bg-slate-950/50 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Recent Alerts (Hit & Miss Log)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Honesty Guard: Zero Cherry-Picking
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Every alert logged from Bitget data, showing both hits and misses chronologically.
              </p>
            </div>

            <div className="text-xs font-mono text-slate-400 flex items-center gap-2 self-start sm:self-auto">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{outcomes.filter((o) => o.hit_status === 'hit').length} Hits</span>
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1 text-rose-400">
                <XCircle className="w-3.5 h-3.5" />
                <span>{outcomes.filter((o) => o.hit_status === 'miss').length} Misses</span>
              </span>
            </div>
          </div>

          {/* Table / List of Recent Alerts */}
          {outcomes.length === 0 ? (
            <p className="text-xs font-mono text-slate-500 py-3">
              No alerts logged yet. Scans run continuously on Bitget spot pairs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800/80 text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-2">Result</th>
                    <th className="py-2 px-2">Pair</th>
                    <th className="py-2 px-2">Trigger</th>
                    <th className="py-2 px-2 text-right">Alert Price</th>
                    <th className="py-2 px-2 text-center">+1h</th>
                    <th className="py-2 px-2 text-center">+4h</th>
                    <th className="py-2 px-2 text-right">Fired (UTC)</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {outcomes.slice(0, 8).map((item) => {
                    const isSelected = solvedCase?.alert_id === item.alert_id;
                    return (
                      <tr
                        key={item.alert_id}
                        className={`hover:bg-slate-900/60 transition-colors ${
                          isSelected ? 'bg-slate-900/90 font-medium' : ''
                        }`}
                      >
                        {/* Result Badge */}
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          {item.hit_status === 'hit' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> HIT
                            </span>
                          ) : item.hit_status === 'miss' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" /> MISS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-800/50 border border-slate-700">
                              <Clock className="w-3 h-3" /> PEND
                            </span>
                          )}
                          {item.is_replay && (
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              R
                            </span>
                          )}
                        </td>

                        {/* Pair */}
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <AssetBadge
                            symbol={item.symbol}
                            assetClass={item.asset_class}
                            size="sm"
                            showLogo={true}
                            showSource={true}
                            showClassTag={true}
                          />
                        </td>

                        {/* Trigger */}
                        <td className="py-2.5 px-2 text-slate-400 max-w-[180px] truncate" title={item.trigger_type_str}>
                          {item.trigger_type_str}
                        </td>

                        {/* Alert Price */}
                        <td className="py-2.5 px-2 text-right whitespace-nowrap text-slate-300">
                          {formatPrice(item.alert_price)}
                        </td>

                        {/* +1h */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={
                              item.move_pct_1h !== null && item.move_pct_1h !== undefined
                                ? item.move_pct_1h > 0
                                  ? 'text-emerald-400 font-semibold'
                                  : item.move_pct_1h < 0
                                  ? 'text-rose-400 font-semibold'
                                  : 'text-slate-400'
                                : 'text-slate-600'
                            }
                          >
                            {formatPct(item.move_pct_1h)}
                          </span>
                        </td>

                        {/* +4h */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={
                              item.move_pct_4h !== null && item.move_pct_4h !== undefined
                                ? item.move_pct_4h > 0
                                  ? 'text-emerald-400 font-semibold'
                                  : item.move_pct_4h < 0
                                  ? 'text-rose-400 font-semibold'
                                  : 'text-slate-400'
                                : 'text-slate-600'
                            }
                          >
                            {formatPct(item.move_pct_4h)}
                          </span>
                        </td>

                        {/* Time */}
                        <td className="py-2.5 px-2 text-right whitespace-nowrap text-slate-400 text-[11px]">
                          {item.time_only_utc || 'UTC'}
                        </td>

                        {/* Action buttons */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedAlertId(item.alert_id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                            >
                              {isSelected ? 'Active' : 'Inspect'}
                            </button>
                            <button
                              onClick={() => handleViewOnChart(item)}
                              className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                              title="Open on Chart"
                            >
                              <LineChart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
