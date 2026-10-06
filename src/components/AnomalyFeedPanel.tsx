import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  Globe,
  Layers,
  Newspaper,
  Radio,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react';
import { AnomalyAlert, AnomalyTriggerType } from '../engine/anomalyEngine';
import { useAnomalyEngine, WATCHLIST_PAIRS } from '../hooks/useAnomalyEngine';
import { AssetBadge } from './AssetBadge';

interface AnomalyFeedPanelProps {
  onSelectPairForChart?: (pair: string) => void;
}

export const AnomalyFeedPanel: React.FC<AnomalyFeedPanelProps> = ({ onSelectPairForChart }) => {
  const {
    alerts,
    pairStatuses,
    config,
    setVolumeMultiplier,
    clearAlerts,
    isScanning,
    lastScanTime,
    scanError,
    triggerManualScan,
    investigateAlert,
  } = useAnomalyEngine();

  const [activeFilter, setActiveFilter] = useState<'all' | AnomalyTriggerType>('all');
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);
  const [showDetectorGrid, setShowDetectorGrid] = useState<boolean>(true);

  // Human Decisions: Watch / Ignore / Snooze
  const [decisions, setDecisions] = useState<Record<string, 'watch' | 'ignore' | 'snooze'>>(() => {
    try {
      const saved = localStorage.getItem('deltaradar_alert_decisions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleHumanDecision = (alertId: string, decision: 'watch' | 'ignore' | 'snooze') => {
    setDecisions((prev) => {
      const next = { ...prev, [alertId]: decision };
      try {
        localStorage.setItem('deltaradar_alert_decisions', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Filter alerts by trigger type
  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === 'all') return true;
    return alert.triggerType === activeFilter;
  });

  const formatPrice = (val: number) => {
    if (!val || isNaN(val)) return '--';
    if (val >= 1000) return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return '$' + val.toFixed(2);
    return '$' + val.toFixed(4);
  };

  const formatUtcTime = (ts: number) => {
    if (!ts) return '--:--:-- UTC';
    const d = new Date(ts);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss} UTC`;
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100 font-mono tracking-tight">
                  Anomaly Engine & Alert Feed
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE SCAN
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Volume Spikes ({config.volumeMultiplier}x) · Breakouts (Swing & Prior-Day) · News Shift (Headlines)
              </p>
            </div>
          </div>

          {/* Quick Actions & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                showConfigDrawer
                  ? 'bg-slate-800 text-slate-100 border-slate-700'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Config ({config.volumeMultiplier}x)</span>
            </button>

            <button
              onClick={() => setShowDetectorGrid(!showDetectorGrid)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                showDetectorGrid
                  ? 'bg-slate-800 text-slate-100 border-slate-700'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showDetectorGrid ? 'Hide Matrix' : 'Show Matrix'}</span>
            </button>

            <button
              onClick={triggerManualScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Scan Now</span>
            </button>
          </div>
        </div>

        {/* Configuration Drawer */}
        {showConfigDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            {/* Multiplier Slider */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-slate-300 font-semibold mb-2">
                <span>Volume Spike Multiplier</span>
                <span className="text-amber-400 font-bold text-sm">{config.volumeMultiplier}x</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="6.0"
                step="0.5"
                value={config.volumeMultiplier}
                onChange={(e) => setVolumeMultiplier(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1.5x</span>
                <span>Default 3.0x</span>
                <span>6.0x</span>
              </div>
            </div>

            {/* Lookback & Baseline */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-300 font-semibold block mb-1">Lookback & Timeframe</span>
              <p className="text-slate-400 text-[11px] mb-2">Rolling 20 periods on 5m candles</p>
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800">5m Bitget Spot</span>
                <span className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800">20 Candles SMA</span>
              </div>
            </div>

            {/* Anti-Spam Cooldown Info */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Spam Cooldown Guard</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Max 1 alert per pair per 30 minutes per trigger type to prevent notification fatigue.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Live Detector Matrix Table */}
      {showDetectorGrid && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Live Watchlist Detector Matrix</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Last Scan: {formatUtcTime(lastScanTime)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Pair</th>
                  <th className="py-2 px-3">Price</th>
                  <th className="py-2 px-3">Volume Spike (3x)</th>
                  <th className="py-2 px-3">Breakout Detector</th>
                  <th className="py-2 px-3">News / Sentiment</th>
                  <th className="py-2 px-3 text-right">Chart Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {WATCHLIST_PAIRS.map((pair) => {
                  const status = pairStatuses[pair];
                  if (!status) {
                    return (
                      <tr key={pair} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3">
                          <AssetBadge
                            symbol={pair}
                            size="sm"
                            showLogo={true}
                            showSource={true}
                            showClassTag={true}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">--</td>
                        <td colSpan={3} className="py-2.5 px-3 text-slate-500 text-[11px]">
                          Connecting to Bitget market feed...
                        </td>
                        <td className="py-2.5 px-3 text-right">--</td>
                      </tr>
                    );
                  }

                  const vol = status.volumeSpike;
                  const bo = status.breakout;
                  const news = status.newsShift;

                  return (
                    <tr key={pair} className="hover:bg-slate-800/30 transition-colors">
                      {/* Pair */}
                      <td className="py-2.5 px-3">
                        <AssetBadge
                          symbol={pair}
                          size="sm"
                          showLogo={true}
                          showSource={true}
                          showClassTag={true}
                        />
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">
                        {status.latestPrice > 0 ? formatPrice(status.latestPrice) : 'no data'}
                      </td>

                      {/* Volume Spike Detector Status */}
                      <td className="py-2.5 px-3">
                        {!vol.hasData ? (
                          <span className="text-slate-500 text-[11px]">no data</span>
                        ) : vol.isSpike ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                            <Flame className="w-3 h-3 text-amber-400" />
                            {vol.ratio}x SPIKE
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {vol.ratio}x avg ({vol.currentVolume.toFixed(0)} / {vol.averageVolume.toFixed(0)})
                          </span>
                        )}
                      </td>

                      {/* Breakout Detector Status */}
                      <td className="py-2.5 px-3">
                        {!bo.hasData ? (
                          <span className="text-slate-500 text-[11px]">no data</span>
                        ) : bo.isBreakout ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-bold ${
                              bo.direction === 'bullish_breakout'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {bo.direction === 'bullish_breakout' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {bo.direction === 'bullish_breakout' ? 'Breakout High' : 'Breakdown Low'} (${bo.brokenLevel})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Range [${bo.swingLow || '--'} - ${bo.swingHigh || '--'}]
                          </span>
                        )}
                      </td>

                      {/* News / Sentiment Status */}
                      <td className="py-2.5 px-3">
                        {news.hasNewsShift ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px]">
                            <Newspaper className="w-3 h-3" />
                            New Headline
                          </span>
                        ) : news.matchingHeadlines.length > 0 ? (
                          <span className="text-slate-400 text-[11px]">
                            {news.matchingHeadlines.length} headlines on record
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">no headlines</span>
                        )}
                      </td>

                      {/* Chart Link */}
                      <td className="py-2.5 px-3 text-right">
                        {onSelectPairForChart ? (
                          <button
                            onClick={() => onSelectPairForChart(pair)}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            <BarChart2 className="w-3 h-3" />
                            <span>View Chart</span>
                          </button>
                        ) : (
                          <span className="text-slate-600">--</span>
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

      {/* Alert Feed Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Feed Header */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100 font-mono tracking-tight">
              Live Alert Feed
            </h3>
            <span className="text-xs font-mono text-slate-500">
              ({filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'})
            </span>
          </div>

          {/* Trigger Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('volume_spike')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'volume_spike'
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Volume Spike
            </button>
            <button
              onClick={() => setActiveFilter('breakout')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'breakout'
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Breakout
            </button>
            <button
              onClick={() => setActiveFilter('news_shift')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'news_shift'
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              News
            </button>

            {alerts.length > 0 && (
              <button
                onClick={clearAlerts}
                className="ml-2 px-2 py-1 text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
                title="Clear Alert Feed"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Alert List */}
        <div className="divide-y divide-slate-800/80">
          {filteredAlerts.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-mono font-medium text-slate-300 mb-1">
                No active anomalies in feed
              </h4>
              <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
                The anomaly engine monitors live Bitget spot volume spikes (&gt;{config.volumeMultiplier}x), swing/prior-day breakouts, and new crypto headlines.
                Alerts will fire in real time as conditions are met. (No mock anomalies injected).
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isVol = alert.triggerType === 'volume_spike';
              const isBo = alert.triggerType === 'breakout';
              const isNews = alert.triggerType === 'news_shift';

              return (
                <div
                  key={alert.id}
                  className="p-4 hover:bg-slate-850/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <AssetBadge
                        symbol={alert.pair}
                        size="md"
                        showLogo={true}
                        showSource={true}
                        showClassTag={true}
                      />

                      {/* Trigger Type Badge */}
                      {isVol && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold">
                          <Flame className="w-3 h-3 text-amber-400" />
                          {alert.triggerLabel}
                        </span>
                      )}

                      {isBo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          {alert.triggerLabel}
                        </span>
                      )}

                      {isNews && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold">
                          <Newspaper className="w-3 h-3 text-indigo-400" />
                          {alert.triggerLabel}
                        </span>
                      )}

                      {/* Move Percentage */}
                      {alert.pctMove !== 0 && (
                        <span
                          className={`font-semibold ${
                            alert.pctMove >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {alert.pctMove >= 0 ? `+${alert.pctMove}%` : `${alert.pctMove}%`}
                        </span>
                      )}

                      {/* Source Requirement: "Bitget [PAIR]" */}
                      <span className="text-slate-500 text-[11px]">
                        Source: <strong className="text-slate-400">{alert.source}</strong>
                      </span>

                      {/* Timestamp */}
                      <span className="text-slate-500 text-[11px] ml-auto sm:ml-0">
                        {alert.utcTimeString}
                      </span>
                    </div>

                    {/* Metric Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-[11px]">
                      <span>
                        Price: <strong className="text-slate-200">{formatPrice(alert.price)}</strong>
                      </span>
                      <span>
                        Volume vs Avg: <strong className="text-slate-300">{alert.volumeVsAverage}</strong>
                      </span>

                      {/* News specific metadata */}
                      {isNews && alert.headline && (
                        <div className="w-full mt-1 p-2 bg-slate-950/80 rounded border border-slate-800 text-slate-300">
                          <p className="font-sans text-xs line-clamp-2">"{alert.headline}"</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>Source: {alert.newsSource}</span>
                            <span className="text-amber-400/90">{alert.causeLabel}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Research Comment (2 sentences: likely cause + what to watch with verified source links) */}
                    {(alert.aiComment || alert.aiLoading) && (
                      <div className="w-full mt-2 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>AI Market Catalyst (Web Grounded)</span>
                          </div>
                          {alert.aiLoading && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                              <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                              <span>Searching web & analyzing...</span>
                            </span>
                          )}
                        </div>

                        {/* 2-Sentence Comment */}
                        {alert.aiComment && (
                          <p className="font-sans text-xs sm:text-sm text-slate-200 leading-relaxed">
                            {alert.aiComment}
                          </p>
                        )}

                        {/* Clickable Source Links */}
                        {alert.aiSources && alert.aiSources.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                            <span className="text-slate-500 text-[10px] uppercase font-bold mr-1">
                              Sources:
                            </span>
                            {alert.aiSources.map((src, i) => (
                              <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400/50 transition-colors group"
                                title={src.title}
                              >
                                <ExternalLink className="w-3 h-3 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                                <span className="font-semibold">{src.source || 'News'}</span>
                                <span className="text-slate-500 hidden sm:inline max-w-[160px] truncate">
                                  · {src.title}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Instant AI Investigation Trigger (if alert fired before investigation completed) */}
                    {!alert.aiComment && !alert.aiLoading && (
                      <div className="pt-1">
                        <button
                          onClick={() => investigateAlert(alert)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Analyze Catalyst with AI</span>
                        </button>
                      </div>
                    )}

                    {/* Human Decision Controls: Watch / Ignore / Snooze */}
                    <div className="pt-2.5 mt-1 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider mr-0.5">
                          Decision:
                        </span>

                        <button
                          onClick={() => handleHumanDecision(alert.id, 'watch')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                            decisions[alert.id] === 'watch'
                              ? 'bg-blue-600 text-white font-semibold shadow-sm'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                          }`}
                          title="Watch setup — opens hypothetical position in Shadow Portfolio"
                        >
                          <Eye className="w-3 h-3 text-blue-400" />
                          <span>Watch</span>
                        </button>

                        <button
                          onClick={() => handleHumanDecision(alert.id, 'ignore')}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            decisions[alert.id] === 'ignore'
                              ? 'bg-slate-800 text-slate-300 font-semibold'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-400 border border-slate-800'
                          }`}
                          title="Ignore setup — dismiss alert"
                        >
                          <XCircle className="w-3 h-3 text-slate-500" />
                          <span>Ignore</span>
                        </button>

                        <button
                          onClick={() => handleHumanDecision(alert.id, 'snooze')}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            decisions[alert.id] === 'snooze'
                              ? 'bg-slate-800 text-amber-300 font-semibold border border-amber-500/30'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-400 border border-slate-800'
                          }`}
                          title="Snooze alerts for this asset for 30 minutes"
                        >
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Snooze</span>
                        </button>
                      </div>

                      {/* Status indicator if human has taken action */}
                      {decisions[alert.id] === 'watch' && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-blue-400" />
                          <span>Watched · Active in Shadow Portfolio</span>
                        </div>
                      )}
                      {decisions[alert.id] === 'ignore' && (
                        <span className="text-[11px] text-slate-500">
                          Ignored by trader
                        </span>
                      )}
                      {decisions[alert.id] === 'snooze' && (
                        <span className="text-[11px] text-amber-400/80">
                          Snoozed (30m cooldown)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Action: Link to Chart */}
                  {onSelectPairForChart && (
                    <div className="shrink-0 flex items-center">
                      <button
                        onClick={() => onSelectPairForChart(alert.pair)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>View Chart</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
