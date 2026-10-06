import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, Sparkles, UserCheck, X } from 'lucide-react';

export const ProblemBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (isDismissed) return null;

  return (
    <section 
      aria-label="Mission and Scope"
      className="border-b border-slate-800/80 bg-[#080d19]/95 text-slate-300 transition-all shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4 text-xs font-sans">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-blue-400 font-bold shrink-0">
              Institutional Research Desk
            </span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <p className="text-slate-300 truncate text-[11px] sm:text-xs font-medium">
              Context-rich, explainable market alerts for part-time retail traders — human judgment always in the loop.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-300 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-slate-800/80"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Hide Brief' : 'Target User & Mandate'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-500 hover:text-slate-300 p-0.5 rounded hover:bg-slate-800/60 transition-colors"
              title="Dismiss banner"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible expanded detail: 4 distinct institutional columns */}
        {isExpanded && (
          <div className="pt-3 pb-2 mt-2 border-t border-slate-800/70 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs leading-relaxed text-slate-300 font-sans">
            {/* 1. Target User */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
                Target User
              </span>
              <p className="text-slate-300">
                Retail traders with moderate risk appetite trading part-time alongside a primary career ($1k–$50k capital). Focused on swing and multi-day short-term setups across altcoins, tokenized US equities, and gold/forex via CFDs.
              </p>
            </div>

            {/* 2. Core Pain Point */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
                Core Pain Point
              </span>
              <p className="text-slate-300">
                Cannot justify a $24k/yr Bloomberg terminal or maintain a dedicated analyst team. Generic charting apps require already knowing what to look for, meaning traders miss moves while away, or cannot discern genuine signals from noise.
              </p>
            </div>

            {/* 3. Why Alternatives Fall Short */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
                Why Alternatives Fall Short
              </span>
              <p className="text-slate-300">
                Basic price alerts give no context. Signal-selling Telegram channels provide no reasoning and zero accountability. Black-box bots remove human control. DeltaRadar fills the middle with explainable alerts and an auditable record.
              </p>
            </div>

            {/* 4. DeltaRadar Hypothesis */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-blue-400 font-bold tracking-wider block">
                The DeltaRadar Mandate
              </span>
              <p className="text-slate-300">
                Faster, better-explained signals lead to better human decisions. Every alert is logged and graded at +1h, +4h, +24h to calibrate trigger weights over time. <strong className="text-slate-200">DeltaRadar never places trades — it is a research desk, not an execution engine.</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
