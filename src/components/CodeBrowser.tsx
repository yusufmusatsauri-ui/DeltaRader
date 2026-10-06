import React, { useState } from 'react';
import { FileCode, Copy, Check, ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface CodeBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

const FILE_REGISTRY: Record<string, { desc: string; code: string }> = {
  'deltaradar/anomaly.py': {
    desc: 'Volume spike (>3x 20-MA), Swing High/Low Breakout, and Sentiment shift detection',
    code: `"""
Anomaly Engine for DeltaRadar.
Detects:
1. Volume spike: volume > [3x] its 20-period average
2. Breakout: close beyond key levels (recent swing high/low, prior-day high/low)
3. News/sentiment shift: sentiment delta beyond threshold
"""
from typing import List, Dict, Any, Tuple, Optional
from deltaradar.models import Candle

class AnomalyDetector:
    def __init__(
        self,
        volume_multiplier: float = 3.0,
        volume_lookback: int = 20,
        swing_lookback: int = 20,
        min_breakout_penetration_pct: float = 0.2,
        sentiment_threshold: float = 0.35,
    ):
        self.volume_multiplier = volume_multiplier
        self.volume_lookback = volume_lookback
        self.swing_lookback = swing_lookback
        self.min_breakout_penetration_pct = min_breakout_penetration_pct
        self.sentiment_threshold = sentiment_threshold

    def check_volume_spike(self, candles: List[Candle]) -> Tuple[bool, float, float]:
        if len(candles) < self.volume_lookback + 1:
            return False, 1.0, 0.0
        current_candle = candles[-1]
        prior_candles = candles[-(self.volume_lookback + 1):-1]
        avg_volume = sum(c.volume for c in prior_candles) / len(prior_candles)
        if avg_volume <= 0:
            return False, 1.0, 0.0
        ratio = current_candle.volume / avg_volume
        is_spike = ratio >= self.volume_multiplier
        return is_spike, round(ratio, 2), round(avg_volume, 2)`,
  },
  'deltaradar/divergence.py': {
    desc: 'Signature Engine: Tokenized Stock/Gold Lag & Lead, Altcoin Decoupling vs BTC',
    code: `"""
Divergence Engine for DeltaRadar (Signature Feature).
1. Tokenized stock/gold token lags or leads its underlying beyond [X]%
2. Altcoin decouples from BTC in the middle of a BTC move
"""
from typing import List, Optional
from deltaradar.models import Candle, DivergenceSignal, DivergenceType

class DivergenceEngine:
    def __init__(
        self,
        tokenized_max_lag_lead_pct: float = 1.2,
        min_btc_move_pct: float = 1.5,
        min_alt_divergence_pct: float = 2.5,
    ):
        self.tokenized_max_lag_lead_pct = tokenized_max_lag_lead_pct
        self.min_btc_move_pct = min_btc_move_pct
        self.min_alt_divergence_pct = min_alt_divergence_pct

    def check_tokenized_divergence(
        self,
        token_symbol: str,
        token_price: float,
        underlying_symbol: str,
        underlying_price: float,
    ) -> DivergenceSignal:
        if underlying_price <= 0:
            return DivergenceSignal(False, DivergenceType.NONE, 0.0, "Invalid underlying price")
        spread_pct = ((token_price - underlying_price) / underlying_price) * 100.0
        if spread_pct > self.tokenized_max_lag_lead_pct:
            return DivergenceSignal(
                True,
                DivergenceType.TOKENIZED_LEAD,
                round(spread_pct, 2),
                f"{token_symbol} trading at premium (+lead) by {spread_pct:.2f}%"
            )
        elif spread_pct < -self.tokenized_max_lag_lead_pct:
            return DivergenceSignal(
                True,
                DivergenceType.TOKENIZED_LAG,
                round(spread_pct, 2),
                f"{token_symbol} trading at discount (-lag) by {abs(spread_pct):.2f}%"
            )
        return DivergenceSignal(False, DivergenceType.NONE, round(spread_pct, 2), "In sync")`,
  },
  'deltaradar/scoring.py': {
    desc: 'Transparent 0-100 Confidence Score with trigger weights, synergy bonus & penalties',
    code: `"""
Confidence Scoring Module (0-100).
Weights each trigger, adds bonus when 2+ triggers align, and applies penalties in thin liquidity or wide spreads.
"""
from deltaradar.models import TriggerWeights, ConfidenceBreakdown

class ConfidenceScorer:
    def __init__(self, weights: Optional[TriggerWeights] = None):
        self.weights = weights or TriggerWeights()

    def calculate(
        self,
        volume_ratio: float,
        is_volume_spike: bool,
        is_breakout: bool,
        breakout_penetration_pct: float,
        is_divergence: bool,
        divergence_gap_pct: float,
        is_sentiment_shift: bool,
        sentiment_delta: float,
        is_thin_liquidity: bool = False,
        spread_bps: float = 5.0,
    ) -> ConfidenceBreakdown:
        # Base contributions derived from calibrated weights
        vol_score = (20.0 + min(1.0, (volume_ratio - 1.0) / 4.0) * 15.0) if is_volume_spike else 0.0
        vol_contrib = vol_score * (self.weights.volume_spike / 0.35)

        bo_score = (20.0 + min(1.0, breakout_penetration_pct / 2.0) * 10.0) if is_breakout else 0.0
        bo_contrib = bo_score * (self.weights.breakout / 0.30)

        div_score = (15.0 + min(1.0, divergence_gap_pct / 3.0) * 15.0) if is_divergence else 0.0
        div_contrib = div_score * (self.weights.divergence / 0.25)

        sent_score = (min(1.0, sentiment_delta) * 20.0) if is_sentiment_shift else 0.0
        sent_contrib = sent_score * (self.weights.sentiment / 0.10)

        # Multi-trigger alignment synergy bonus
        active_triggers = sum([is_volume_spike, is_breakout, is_divergence, is_sentiment_shift])
        synergy_bonus = 25.0 if active_triggers >= 3 else (15.0 if active_triggers == 2 else 0.0)

        # Penalties
        liq_penalty = 15.0 if is_thin_liquidity else 0.0
        spread_penalty = 12.0 if spread_bps > 18.0 else 0.0

        raw_total = vol_contrib + bo_contrib + div_contrib + sent_contrib + synergy_bonus - liq_penalty - spread_penalty
        final_score = max(0, min(100, round(raw_total)))
        ...`,
  },
  'deltaradar/outcome_tracker.py': {
    desc: 'Multi-horizon outcome verification (+1h, +4h, +24h) against directional size targets',
    code: `"""
Outcome Tracker for DeltaRadar.
At +1h, +4h, +24h records the move after each alert.
Marks hit or miss vs direction and size threshold.
"""
import time
from typing import Dict, Any, Optional
from deltaradar.models import Alert, OutcomeRecord
from deltaradar.db import Database

class OutcomeTracker:
    def __init__(
        self,
        db: Database,
        target_move_1h_pct: float = 1.2,
        target_move_4h_pct: float = 2.5,
        target_move_24h_pct: float = 4.5,
    ):
        self.db = db
        self.target_move_1h_pct = target_move_1h_pct
        self.target_move_4h_pct = target_move_4h_pct
        self.target_move_24h_pct = target_move_24h_pct
    ...`,
  },
  'deltaradar/calibration.py': {
    desc: 'Self-Calibration Engine: weekly trigger weight adjustment from empirical hit rates',
    code: `"""
Self-Calibration Engine for DeltaRadar.
Weekly, adjusts trigger weights from empirical hit rates.
Produces report of hit rate by trigger, asset class, and confidence band.
"""
from typing import Dict, Any, List
from deltaradar.models import TriggerWeights
from deltaradar.db import Database

class CalibrationEngine:
    def __init__(self, db: Database, target_hit_rate: float = 65.0):
        self.db = db
        self.target_hit_rate = target_hit_rate
    ...`,
  },
};

export const CodeBrowser: React.FC<CodeBrowserProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<string>('deltaradar/divergence.py');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const current = FILE_REGISTRY[selectedFile] || { desc: '', code: '' };

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-mono text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">DeltaRadar Python Source Browser</h2>
              <p className="text-xs text-slate-400">{current.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Browser Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree Sidebar */}
          <div className="w-64 bg-slate-950 p-3 border-r border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">
              Modules &amp; Engines
            </div>
            {Object.keys(FILE_REGISTRY).map((fileName) => (
              <button
                key={fileName}
                onClick={() => setSelectedFile(fileName)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition flex items-center gap-2 ${
                  selectedFile === fileName
                    ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{fileName}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 bg-black/90 p-4 overflow-y-auto font-mono text-[12px] text-slate-200 leading-relaxed whitespace-pre selection:bg-cyan-500/30">
            {current.code}
          </div>
        </div>
      </div>
    </div>
  );
};
