import React, { useState } from 'react';
import { X, Database, Check, ShieldCheck, Layers, Radio, Globe, Zap, Cpu } from 'lucide-react';

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({ isOpen, onClose }) => {
  const [altcoinProvider, setAltcoinProvider] = useState<'bitget' | 'binance' | 'coingecko'>('bitget');
  const [forexProvider, setForexProvider] = useState<'yahoo' | 'finnhub' | 'twelvedata'>('yahoo');
  const [newsProvider, setNewsProvider] = useState<'rss' | 'cryptocompare' | 'gemini_grounding'>('gemini_grounding');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white">Market Data Source Architecture</h2>
              <p className="text-xs text-slate-400">
                Plug-and-play adapter layer (Free-tier, Bitget WebSocket, &amp; Public Endpoints)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Architecture Abstract Statement */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Modular Feed Adapter Interface</span>
            </div>
            <p className="leading-relaxed">
              Every data feed in DeltaRadar implements the abstract <code>BaseFeedAdapter</code> interface. This guarantees that whether data originates from Bitget WebSocket, Bitget MCP tools, Binance, or CCXT, no anomaly or divergence logic is hardcoded.
            </p>
          </div>

          {/* Module 1: Altcoin Data Provider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                1. Altcoin Order Book &amp; Candle Source
              </span>
              <span className="text-cyan-400 font-semibold">Active: Bitget WS + REST</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <label
                onClick={() => setAltcoinProvider('bitget')}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  altcoinProvider === 'bitget'
                    ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-white">Bitget Public API</div>
                  <div className="text-[11px] text-slate-400 mt-1">wss://ws.bitget.com/v2/ws/public</div>
                </div>
                <div className="mt-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Recommended (No API key needed)
                </div>
              </label>

              <label
                onClick={() => setAltcoinProvider('binance')}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  altcoinProvider === 'binance'
                    ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-white">Binance Public WS</div>
                  <div className="text-[11px] text-slate-400 mt-1">wss://stream.binance.com:9443</div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">Supported by adapter</div>
              </label>

              <label
                onClick={() => setAltcoinProvider('coingecko')}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  altcoinProvider === 'coingecko'
                    ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-white">CoinGecko Demo</div>
                  <div className="text-[11px] text-slate-400 mt-1">api.coingecko.com/api/v3</div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">Polling fallback</div>
              </label>
            </div>
          </div>

          {/* Module 2: Forex & Tokenized Stocks Provider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-400" />
                2. Forex &amp; Tokenized Stock Underlyings
              </span>
              <span className="text-indigo-400 font-semibold">Active: Yahoo / Finnhub</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <label
                onClick={() => setForexProvider('yahoo')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  forexProvider === 'yahoo'
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-white">Yahoo Finance REST</div>
                <div className="text-[11px] text-slate-400 mt-1">Free-tier public endpoint</div>
              </label>

              <label
                onClick={() => setForexProvider('finnhub')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  forexProvider === 'finnhub'
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-white">Finnhub API</div>
                <div className="text-[11px] text-slate-400 mt-1">Stock quote endpoint</div>
              </label>

              <label
                onClick={() => setForexProvider('twelvedata')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  forexProvider === 'twelvedata'
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-white">TwelveData</div>
                <div className="text-[11px] text-slate-400 mt-1">Forex real-time quotes</div>
              </label>
            </div>
          </div>

          {/* Module 3: News & Cause Check */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-400" />
                3. News Headlines &amp; LLM Cause Engine
              </span>
              <span className="text-amber-400 font-semibold">Active: Gemini 3.8 Flash</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
              <div className="flex justify-between items-center text-slate-200 font-bold">
                <span>Gemini Cause Synthesis</span>
                <span className="text-emerald-400 font-normal">Enabled</span>
              </div>
              <p className="text-[11px] text-slate-400">
                When an anomaly triggers, DeltaRadar matches breaking headlines from CoinDesk, Reuters, and Bloomberg, feeding them into Gemini to synthesize a 1-2 sentence fundamental summary.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition shadow-md shadow-cyan-600/20"
          >
            Confirm Data Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
