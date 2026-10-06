import React, { useState, useEffect } from 'react';
import { Radar, Terminal, Database, Sliders, ShieldAlert, Play, CheckCircle2, RefreshCw, BookOpen, Briefcase, Activity } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTerminal: (cmd?: string) => void;
  onOpenDataSources: () => void;
  onOpenConfig: () => void;
  onTriggerAnomaly: () => void;
  onOpenMonitoring: () => void;
  alertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTerminal,
  onOpenDataSources,
  onOpenConfig,
  onTriggerAnomaly,
  onOpenMonitoring,
  alertCount,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'radar', label: 'Live Radar & Feed', icon: Radar },
    { id: 'shadow', label: 'Shadow Portfolio', icon: Briefcase },
    { id: 'journal', label: 'Decision Journal', icon: BookOpen },
    { id: 'telegram', label: 'Telegram Desk', icon: ShieldAlert, badge: alertCount },
    { id: 'divergence', label: 'Divergence Engine', icon: RefreshCw },
    { id: 'scoring', label: 'Scoring Formula', icon: Sliders },
    { id: 'outcomes', label: 'Outcome Tracker (+1h/+4h/+24h)', icon: CheckCircle2 },
    { id: 'calibration', label: 'Self-Calibration', icon: Database },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100">
      {/* Top Banner Notice */}
      <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-1 text-xs text-amber-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-medium">MANDATE:</span>
          <span className="text-amber-200/90">
            DeltaRadar is an <strong>alert-only agent</strong>. It NEVER executes trades or manages funds.
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <button
            onClick={onOpenMonitoring}
            className="flex items-center gap-1.5 text-emerald-400 font-semibold hover:text-emerald-300 transition"
            title="Inspect 24/7 Continuous Service & Feed Silence Watchdog"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            24/7 MONITORING: HEALTHY (99.98% SLA)
          </button>
          <span>•</span>
          <span>{utcTime}</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('radar')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Radar className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-mono">
                DELTA<span className="text-cyan-400">RADAR</span>
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                v1.0 Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Anomaly & Divergence Market Radar</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/30 text-cyan-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMonitoring}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 transition shadow-sm"
            title="Open 24/7 Monitoring Dashboard, Feed Watchdog, and Quiet Hours Queue"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>24/7 Watchdog</span>
          </button>

          <button
            onClick={onTriggerAnomaly}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-300 border border-amber-500/30 transition shadow-sm"
            title="Simulate incoming volume spike and divergence anomaly"
          >
            <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Simulate Anomaly</span>
          </button>

          <button
            onClick={() => onOpenTerminal('test')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Run Python Test Suite (18 Unit Tests)"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Run Tests</span>
          </button>

          <button
            onClick={onOpenDataSources}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Confirm or change Market Data Sources"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Data Sources</span>
          </button>

          <button
            onClick={onOpenConfig}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/80 transition"
            title="Edit config.yaml (Watchlist & Thresholds)"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
