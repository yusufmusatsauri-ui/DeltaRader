import React from 'react';
import {
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Download,
  ExternalLink,
  Layers,
  Milestone,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface SystemAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemAuditModal: React.FC<SystemAuditModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
        className="bg-[#0a0f1d] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#080d19]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="audit-modal-title" className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight">
                  DeltaRadar Build Status &amp; Engineering Audit
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950 text-blue-300 border border-blue-500/30">
                  Pre-Launch
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Component verification, technical challenges, and roadmap
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close Audit Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-300">
          {/* Section 1: Built (Verified in Current Production Build) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                1. Built &amp; Verified in Current Build
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
                <strong className="text-slate-100 block font-mono text-[11px]">Live Bitget Price Board</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Streams real-time spot tickers via direct public WebSocket and REST fallback with verified source and timestamps on every price (zero mock data).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
                <strong className="text-slate-100 block font-mono text-[11px]">Interactive Trading Chart</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Real Bitget kline data across timeframes (1m, 5m, 15m, 1h, 4h, 1D), volume histogram, and configurable indicators (SMA, EMA, RSI, MACD).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
                <strong className="text-slate-100 block font-mono text-[11px]">Real-Time Order Book Depth</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Streams live public L2 bids/asks with depth bars, spread calculation, and Bid/Ask liquidity ratios directly from Bitget.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
                <strong className="text-slate-100 block font-mono text-[11px]">Anomaly Detector Engine</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Statistical volume spike detection (vs. 20-period moving average) and key-level breakout detection with 30-minute spam-prevention cooldowns.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
                <strong className="text-slate-100 block font-mono text-[11px]">Problem Banner &amp; Solved Case</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Main-screen problem banner and real historical alert case studies pulled from the SQLite audit database.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
                <strong className="text-slate-100 block font-mono text-[11px]">Multi-Asset Watchlist Management</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Support for crypto, tokenized stocks, and CFD gold/forex pairs with standardized asset-class and Bitget source tags everywhere.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1 md:col-span-2">
                <strong className="text-slate-100 block font-mono text-[11px]">Institutional Dark-Mode UI Layer</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Professional trading desk visual design: near-black canvas, Electric Blue DeltaRadar branding, strict green/red reservation for prices &amp; hits/misses, and monospace numbers.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Problems Hit & How They Were Solved */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                2. Problems Hit &amp; How They Were Solved
              </h3>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-rose-400">Problem 1: Risk of Stale or Cached Prices</span>
                  <span className="text-emerald-400">Resolved</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Initial builds risked presenting cached prices. Solved by mandating that every displayed price renders its source (<code className="text-slate-300">Bitget [PAIR]</code>) and exact timestamp, backed by a 10s <code className="text-emerald-400">LIVE</code> / <code className="text-rose-400">STALE</code> indicator and automated WebSocket vs. REST sanity verification.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-amber-400">Problem 2: Build Environment Quota Limits</span>
                  <span className="text-emerald-400">Resolved</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Multi-feature prompt batches hit model token quotas during build runs. Solved by breaking the build sequence into modular, single-feature implementations, independently compiled and linted with deferred verification.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Roadmap (What's Next) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Milestone className="w-4 h-4 text-amber-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                3. Engineering Roadmap: What's Next
              </h3>
            </div>
            <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800/80 space-y-2">
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 font-mono">
                <li><strong className="text-white">Divergence Engine:</strong> Tokenized asset vs. underlying equity lag/lead, and altcoin vs. BTC decoupling.</li>
                <li><strong className="text-white">AI-Grounded Cause Commentary:</strong> Web-grounded live news research formulated into concise 2-sentence catalyst summaries with clickable sources.</li>
                <li><strong className="text-white">Desk Brief &amp; Trade Idea Cards:</strong> Structured tactical cards detailing entry zones, invalidation levels, price targets, and Risk/Reward ratios.</li>
                <li><strong className="text-white">Human Decision Flow &amp; Shadow Portfolio:</strong> Watch/Ignore/Snooze decision journal and hypothetical position tracking on Watched setups.</li>
                <li><strong className="text-white">Automated Outcome Grading (+1h/+4h/+24h):</strong> Empirical hit/miss evaluation and weekly recalibration of detector weights.</li>
                <li><strong className="text-white">Telegram Bot &amp; Always-On Hosting:</strong> 24/7 background worker dispatching low-latency push alerts to Telegram channels.</li>
              </ol>
            </div>
          </div>

          {/* Section: GitHub Hackathon Package */}
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-blue-300">
                  Hackathon S2 Submission Archive
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-500/40 font-semibold">
                Ready for GitHub
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Complete source archive (<code className="text-blue-300">deltarader.zip</code>) containing all components, configs, README.md, .gitignore, and LICENSE, strictly sanitized with zero API keys or secrets.
            </p>
            <div className="pt-0.5">
              <a
                href="/deltarader.zip"
                download="deltarader.zip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download deltarader.zip</span>
              </a>
            </div>
          </div>

          {/* Section 4: Frameworks & APIs Used */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                4. Frameworks &amp; APIs Integrated
              </h3>
            </div>
            <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed font-mono">
              <p>• <strong className="text-slate-200">Bitget Public Market Data:</strong> Public WebSocket (<code className="text-blue-300">wss://ws.bitget.com/v2/ws/public</code>) + REST endpoints for tickers, candles, and order books.</p>
              <p>• <strong className="text-slate-200">Build Environment:</strong> Google AI Studio (Gemini SDK) for code generation, live testing, and web grounding.</p>
              <p>• <strong className="text-slate-200">Runtime Stack:</strong> React + TypeScript, Vite, Tailwind CSS, Express backend proxy for CORS resilience.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#080d19] flex items-center justify-between text-xs font-mono text-slate-500">
          <span>DeltaRadar Institutional Intelligence Desk</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
