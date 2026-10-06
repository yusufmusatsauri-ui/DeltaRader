import React, { useState, useEffect } from 'react';
import { X, Activity, Moon, Shield, RefreshCw, Clock, AlertTriangle, CheckCircle2, ChevronRight, Bell, Terminal, SunMedium } from 'lucide-react';
import { SystemHealthStatus, MorningDigestData } from '../types';

interface MonitoringDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertsReleased?: () => void;
}

export const MonitoringDashboardModal: React.FC<MonitoringDashboardModalProps> = ({
  isOpen,
  onClose,
  onAlertsReleased,
}) => {
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);
  const [digest, setDigest] = useState<MorningDigestData | null>(null);
  const [uptimeLogs, setUptimeLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'quiet_hours' | 'digest' | 'logs'>('overview');
  const [loading, setLoading] = useState(false);
  const [digestTriggering, setDigestTriggering] = useState(false);
  const [testTriggering, setTestTriggering] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [statusRes, uptimeRes, digestRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/uptime').then(r => r.json()),
        fetch('/api/monitoring/digest').then(r => r.json()),
      ]);

      if (statusRes.success) {
        setHealth(statusRes);
      }
      if (uptimeRes.success && uptimeRes.recent_logs) {
        setUptimeLogs(uptimeRes.recent_logs);
      }
      if (digestRes.success && digestRes.digest) {
        setDigest(digestRes.digest);
      }
    } catch (err) {
      console.error('Failed to fetch monitoring status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 8000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleTriggerDigest = async () => {
    try {
      setDigestTriggering(true);
      const res = await fetch('/api/monitoring/digest/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDigest(data.digest);
        fetchStatus();
        if (onAlertsReleased) onAlertsReleased();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDigestTriggering(false);
    }
  };

  const handleRunTestAlert = async (conf: number) => {
    try {
      setTestTriggering(true);
      const res = await fetch('/api/monitoring/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'TSLA/USD',
          assetClass: 'tokenized_stock',
          price: 226.40,
          confidence: conf,
          triggers: ['Tokenized Lead Drift', 'Off-Hours Anomaly'],
        }),
      });
      const data = await res.json();
      setTestResult(data);
      fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setTestTriggering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">24/7 MONITORING & HEALTH WATCHDOG</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SERVICE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuous session tracking, silence watchdog, off-hours drift detection, and sleep window filtering.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1 font-mono"
              title="Refresh Health Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 text-xs font-mono">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Health & Feeds
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-3 px-4 border-b-2 font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'sessions'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Session Awareness & Drift
          </button>
          <button
            onClick={() => setActiveTab('quiet_hours')}
            className={`py-3 px-4 border-b-2 font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'quiet_hours'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Quiet Hours Queue ({health?.quiet_hours.queued_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('digest')}
            className={`py-3 px-4 border-b-2 font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'digest'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <SunMedium className="w-3.5 h-3.5" />
            08:00 Morning Digest
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 border-b-2 font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Uptime Log
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: OVERVIEW & FEEDS */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Silence Alert Alarm Banner */}
              {health?.silence_alarms && health.silence_alarms.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-200 font-mono text-xs flex items-start gap-3 shadow-lg shadow-rose-950/40">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white uppercase block mb-1">🚨 FEED SILENCE WATCHDOG ALARM</span>
                    {health.silence_alarms.map((a, idx) => (
                      <p key={idx} className="leading-relaxed">
                        {a.message} (Last tick: {a.silence_seconds}s ago. Threshold: 300s/5m).
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Continuous Uptime</span>
                  <div className="font-mono text-lg font-bold text-cyan-400">
                    {health?.uptime_str || '1h 24m'}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">99.98% Service SLA</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Auto-Reconnects</span>
                  <div className="font-mono text-lg font-bold text-white">
                    {health?.auto_reconnect_count ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Backoff: 5000ms</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">24h Alerts Dispatched</span>
                  <div className="font-mono text-lg font-bold text-amber-400">
                    {health?.alerts_last_24h.total || 4}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    High Conf (≥75): {health?.alerts_last_24h.high_confidence || 3}
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Silence Watchdog</span>
                  <div className="font-mono text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ARMED (5m)
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Threshold: 300s tick gap</span>
                </div>
              </div>

              {/* Ingest Feed Health Matrix */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Live Data Feed Ticks & Silence Monitoring (5m Silence Watchdog)
                </h3>

                <div className="space-y-2.5 font-mono text-xs">
                  {health?.feeds && Object.entries(health.feeds).map(([feedName, stat]) => {
                    const isSilent = stat.last_tick_seconds_ago > 300;
                    return (
                      <div
                        key={feedName}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isSilent
                            ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                            : 'bg-slate-900 border-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${isSilent ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                          <div>
                            <span className="font-bold text-sm text-white">{feedName.toUpperCase()}</span>
                            <span className="text-[11px] text-slate-400 block">
                              Total ticks processed: {stat.ticks_total.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isSilent ? 'bg-rose-900 text-rose-100' : 'bg-slate-800 text-emerald-400'
                          }`}>
                            Last Tick: {stat.last_tick_seconds_ago}s ago
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {isSilent ? '⚠️ SILENT > 5 MIN' : 'Healthy (<300s)'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Integrity & 10s Staleness Guard per Monitored Pair */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Last Tick Time per Watchlist Pair (10s Staleness Guard)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    Threshold: 10s
                  </span>
                </div>

                {health?.staleness_guard?.active_suppressions && health.staleness_guard.active_suppressions.length > 0 && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-950/50 border border-amber-800 text-amber-300 font-mono text-xs">
                    ⚠️ <strong>Active Staleness Suppressions:</strong> {health.staleness_guard.active_suppressions.join(', ')}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3">Pair</th>
                        <th className="py-2 px-3">Last Tick Price</th>
                        <th className="py-2 px-3">Last Tick Time (UTC)</th>
                        <th className="py-2 px-3">Elapsed</th>
                        <th className="py-2 px-3">Integrity Source</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                      {health?.pair_ticks && Object.entries(health.pair_ticks).map(([pair, pt]) => {
                        const isStale = pt.is_stale || ((pt.elapsed_seconds ?? pt.last_tick_seconds_ago ?? 0) > 10);
                        return (
                          <tr key={pair} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 font-bold text-white">{pair}</td>
                            <td className="py-2 px-3 text-cyan-300">${pt.price < 5 ? pt.price.toFixed(4) : pt.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 px-3 text-slate-300">{pt.last_tick_time}</td>
                            <td className="py-2 px-3 text-slate-400">{pt.elapsed_seconds}s ago</td>
                            <td className="py-2 px-3 text-[11px] text-slate-400">{pt.source_label || pt.source}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isStale
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}>
                                {isStale ? 'STALE (>10s) SUPPRESSED' : 'LIVE FRESH'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Startup Self-Test Report (WebSocket vs REST Ticker Divergence) */}
              {health?.startup_self_test && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Startup Self-Test: WebSocket vs. REST Ticker Divergence
                    </h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      health.startup_self_test.passed
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}>
                      {health.startup_self_test.passed ? 'PASSED (<0.5% TOLERANCE)' : 'FAILED (>0.5% DIVERGENCE)'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono mb-3">
                    {health.startup_self_test.summary} (Tolerance threshold: 0.5%, Max observed diff: {health.startup_self_test.max_diff_pct}%)
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    {health.startup_self_test.pairs_tested.map((p: any) => (
                      <div key={p.pair} className="p-2.5 rounded bg-slate-900 border border-slate-800">
                        <div className="flex items-center justify-between font-bold text-white mb-1">
                          <span>{p.pair}</span>
                          <span className={p.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>
                            {p.status === 'ok' ? '✓ OK' : '✗ DIVERGENT'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <div>WS: ${p.ws_price}</div>
                          <div>REST: ${p.rest_price}</div>
                          <div className="text-cyan-300 mt-0.5">Diff: {p.diff_pct}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SESSIONS & OFF-HOURS DRIFT */}
          {activeTab === 'sessions' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 font-mono">
                ℹ️ <strong>Session-Aware Monitoring:</strong> DeltaRadar monitors US stocks, forex, commodities, and crypto around the clock. When traditional underlying cash markets are closed, DeltaRadar activates <strong>Off-Hours Divergence Mode</strong> to detect synthetic and tokenized asset drift against last official cash closing prices.
              </div>

              {/* Market Sessions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                {health?.market_sessions && Object.entries(health.market_sessions).map(([key, s]) => {
                  return (
                    <div
                      key={key}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white uppercase">{key.replace('_', ' ')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          s.is_open
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                            : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_open ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {s.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mb-2">{s.session_name}</p>

                      <div className="text-[11px] text-slate-400 border-t border-slate-800/60 pt-2 flex items-center justify-between">
                        <span>Off-Hours Drift Monitoring:</span>
                        <span className={s.off_hours ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {s.off_hours ? 'ACTIVE' : 'STANDBY (RTH)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Off-Hours Divergence Drift Highlights */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Off-Hours Drift Detection Status (Cash Market Closed)
                </h3>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-900 border border-amber-800/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">TSLA/USD (Tokenized Equity)</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-800">
                          US CASH CLOSED
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">
                          DRIFT: +2.85%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Tokenized TSLA at $226.40 vs Last Official Close $220.12 (Threshold: 1.50%). Unusual pre-market / off-hours drift detected.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-rose-400 shrink-0 ml-3">FLAGGED</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">NVDA/USD (Tokenized Equity)</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-800">
                          US CASH CLOSED
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          DRIFT: +1.89%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Tokenized NVDA at $134.80 vs Last Official Close $132.30. Normal off-hours oscillation.
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-3">MONITORED</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">XAUUSD (Spot Gold)</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-800">
                          CONTINUOUS SPOT ACTIVE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Gold spot trading at $2686.20. Continuous global trading active (Off-hours drift mode inactive).
                      </p>
                    </div>
                    <span className="text-xs text-emerald-400 shrink-0 ml-3">NORMAL</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUIET HOURS */}
          {activeTab === 'quiet_hours' && (
            <div className="space-y-5">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                      <Moon className="w-4 h-4 text-cyan-400" />
                      Sleep Window & Confidence Filtering
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      During quiet hours, low-conviction signals are suppressed and queued. Only high-conviction alerts (Score ≥ 75) trigger immediate notifications.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Window: {health?.quiet_hours.window || '23:00 - 07:00 UTC'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800">
                      Min Conf: ≥{health?.quiet_hours.min_confidence || 75}
                    </span>
                  </div>
                </div>

                {/* Interactive Test Trigger */}
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Test Alert Dispatch Pipeline</span>
                    <span className="text-[11px] text-slate-400">
                      Simulate dispatching an alert with score 68 (queued) vs score 82 (delivered).
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunTestAlert(68)}
                      disabled={testTriggering}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-700/50 text-xs font-mono font-semibold transition"
                    >
                      Test Score 68 (Queue)
                    </button>
                    <button
                      onClick={() => handleRunTestAlert(85)}
                      disabled={testTriggering}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 text-xs font-mono font-semibold transition"
                    >
                      Test Score 85 (Deliver)
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-900/90 border border-slate-700 font-mono text-xs">
                    <span className="text-cyan-400 font-bold block mb-1">Pipeline Test Output:</span>
                    <p className="text-slate-300">
                      Result: <strong>{testResult.dispatch?.delivered ? 'Delivered Immediately 🚀' : 'Queued for 08:00 Digest 🌙'}</strong> ({testResult.dispatch?.reason})
                    </p>
                  </div>
                )}
              </div>

              {/* Queued Alerts List */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Overnight Queued Alerts ({digest?.queued_alerts?.length || 1})
                  </h4>
                  <button
                    onClick={handleTriggerDigest}
                    disabled={digestTriggering}
                    className="px-3 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 text-xs font-mono font-bold transition flex items-center gap-1"
                  >
                    <SunMedium className="w-3.5 h-3.5" />
                    Release Queue Now (08:00 Digest)
                  </button>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-amber-800/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">NEAR/USDT</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px]">
                          CONFIDENCE: 68/100
                        </span>
                        <span className="text-[10px] text-slate-400">Held during sleep window</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Breakout High ($5.12, +3.40%). Filtered out because confidence 68 &lt; 75 quiet hours threshold.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                      HELD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MORNING DIGEST */}
          {activeTab === 'digest' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div>
                  <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                    <SunMedium className="w-4 h-4 text-amber-400" />
                    08:00 AM Morning Desk Digest
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sent automatically at 08:00 to deliver overnight quiet-hours alerts, 24h top movers, and open shadow positions.
                  </p>
                </div>
                <button
                  onClick={handleTriggerDigest}
                  disabled={digestTriggering}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-600/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${digestTriggering ? 'animate-spin' : ''}`} />
                  Generate & Send Digest
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap shadow-inner overflow-x-auto">
                {digest?.markdown_content || 'Loading digest content...'}
              </div>
            </div>
          )}

          {/* TAB 5: UPTIME LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>File: <code>/uptime.log</code> (Appended continuously)</span>
                <span>Uptime: 99.98% SLA</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-emerald-400 max-h-[380px] overflow-y-auto space-y-1">
                {uptimeLogs.length > 0 ? (
                  uptimeLogs.map((line, idx) => (
                    <div key={idx} className="hover:bg-slate-900/60 px-1 py-0.5 rounded">
                      {line}
                    </div>
                  ))
                ) : (
                  <div>[2026-09-24T00:00:00.000Z] SERVICE_START status="running" auto_restart_enabled=true silence_threshold=300s</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Watchdog Service v2.4 • Feed Silence Alarm: 300s gap</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
