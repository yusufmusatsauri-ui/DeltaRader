import React, { useState } from 'react';
import { Sliders, Zap, TrendingUp, Layers, Newspaper, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export const ConfidenceInspector: React.FC = () => {
  const [volMultiplier, setVolMultiplier] = useState<number>(4.2);
  const [hasBreakout, setHasBreakout] = useState<boolean>(true);
  const [breakoutPenetration, setBreakoutPenetration] = useState<number>(1.2);
  const [hasDivergence, setHasDivergence] = useState<boolean>(true);
  const [divergenceGap, setDivergenceGap] = useState<number>(2.4);
  const [hasSentiment, setHasSentiment] = useState<boolean>(false);
  const [sentimentScore, setSentimentScore] = useState<number>(0.4);

  const [isThinLiquidity, setIsThinLiquidity] = useState<boolean>(false);
  const [isWideSpread, setIsWideSpread] = useState<boolean>(false);

  // Weights (calibrated)
  const weights = {
    volume: 0.33,
    breakout: 0.32,
    divergence: 0.28,
    sentiment: 0.07,
  };

  // Calculations
  const isVolSpike = volMultiplier >= 3.0;
  const volNorm = Math.min(1.0, (volMultiplier - 1.0) / 4.0);
  const volPts = isVolSpike ? 20.0 + volNorm * 15.0 : 0.0;
  const volContr = +(volPts * (weights.volume / 0.35)).toFixed(1);

  const boNorm = Math.min(1.0, breakoutPenetration / 2.0);
  const boPts = hasBreakout ? 20.0 + boNorm * 10.0 : 0.0;
  const boContr = +(boPts * (weights.breakout / 0.30)).toFixed(1);

  const divNorm = Math.min(1.0, divergenceGap / 3.0);
  const divPts = hasDivergence ? 15.0 + divNorm * 15.0 : 0.0;
  const divContr = +(divPts * (weights.divergence / 0.25)).toFixed(1);

  const sentPts = hasSentiment ? Math.min(1.0, sentimentScore) * 20.0 : 0.0;
  const sentContr = +(sentPts * (weights.sentiment / 0.10)).toFixed(1);

  const baseScore = +(volContr + boContr + divContr + sentContr).toFixed(1);

  // Active triggers count
  let triggerCount = 0;
  if (isVolSpike) triggerCount++;
  if (hasBreakout) triggerCount++;
  if (hasDivergence) triggerCount++;
  if (hasSentiment) triggerCount++;

  let synergyBonus = 0;
  if (triggerCount >= 3) synergyBonus = 25;
  else if (triggerCount === 2) synergyBonus = 15;

  const liqPenalty = isThinLiquidity ? 15 : 0;
  const spreadPenalty = isWideSpread ? 12 : 0;

  const rawScore = baseScore + synergyBonus - liqPenalty - spreadPenalty;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              CONFIDENCE SCORING FORMULA
            </h2>
            <p className="text-xs text-slate-400">
              Interactive simulator of trigger weights, multi-trigger synergy alignment, and liquidity penalties.
            </p>
          </div>

          {/* Big Score Result */}
          <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">CALCULATED SCORE</span>
              <span className="text-2xl font-extrabold text-cyan-400">{finalScore} / 100</span>
            </div>
            <div className="text-xs">
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  finalScore >= 80
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : finalScore >= 60
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {finalScore >= 80 ? 'HIGH CONVICTION' : finalScore >= 60 ? 'ALERT TRIGGERED' : 'SUPPRESSED (<60)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Adjust Input Trigger Parameters
          </h3>

          {/* Volume Spike Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-200 flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Volume vs 20-MA
              </span>
              <span className="text-amber-400 font-bold">{volMultiplier.toFixed(1)}x {isVolSpike ? '(Spike Active)' : '(Below 3.0x Threshold)'}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.2"
              value={volMultiplier}
              onChange={(e) => setVolMultiplier(parseFloat(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Breakout Toggle & Penetration */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-bold">
                <input
                  type="checkbox"
                  checked={hasBreakout}
                  onChange={(e) => setHasBreakout(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                Breakout Beyond 20-Period High/Low
              </label>
              <span className="text-cyan-400 font-bold">+{breakoutPenetration.toFixed(1)}% Pen.</span>
            </div>
            {hasBreakout && (
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={breakoutPenetration}
                onChange={(e) => setBreakoutPenetration(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            )}
          </div>

          {/* Divergence Toggle & Gap */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-bold">
                <input
                  type="checkbox"
                  checked={hasDivergence}
                  onChange={(e) => setHasDivergence(e.target.checked)}
                  className="rounded accent-indigo-400"
                />
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Divergence / Decoupling Spread
              </label>
              <span className="text-indigo-400 font-bold">{divergenceGap.toFixed(1)}% Spread</span>
            </div>
            {hasDivergence && (
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.1"
                value={divergenceGap}
                onChange={(e) => setDivergenceGap(parseFloat(e.target.value))}
                className="w-full accent-indigo-400"
              />
            )}
          </div>

          {/* Sentiment Shift */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-bold">
                <input
                  type="checkbox"
                  checked={hasSentiment}
                  onChange={(e) => setHasSentiment(e.target.checked)}
                  className="rounded accent-emerald-400"
                />
                <Newspaper className="w-3.5 h-3.5 text-emerald-400" />
                News / Headline Sentiment Shift
              </label>
              <span className="text-emerald-400 font-bold">Score: {sentimentScore.toFixed(2)}</span>
            </div>
          </div>

          {/* Penalty Checkboxes */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Market Quality Filters</span>
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer text-rose-300">
                <input
                  type="checkbox"
                  checked={isThinLiquidity}
                  onChange={(e) => setIsThinLiquidity(e.target.checked)}
                  className="accent-rose-500"
                />
                Thin Liquidity Penalty (-15 pts)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-rose-300">
                <input
                  type="checkbox"
                  checked={isWideSpread}
                  onChange={(e) => setIsWideSpread(e.target.checked)}
                  className="accent-rose-500"
                />
                Wide Bid-Ask Spread Penalty (-12 pts)
              </label>
            </div>
          </div>
        </div>

        {/* Live Mathematical Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Mathematical Score Itemization
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300">Volume Spike Contribution (Weight: {(weights.volume * 100).toFixed(0)}%)</span>
              <span className="font-bold text-amber-400">+{volContr} pts</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300">Breakout Contribution (Weight: {(weights.breakout * 100).toFixed(0)}%)</span>
              <span className="font-bold text-cyan-400">+{boContr} pts</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300">Divergence Contribution (Weight: {(weights.divergence * 100).toFixed(0)}%)</span>
              <span className="font-bold text-indigo-400">+{divContr} pts</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300">Sentiment Shift (Weight: {(weights.sentiment * 100).toFixed(0)}%)</span>
              <span className="font-bold text-emerald-400">+{sentContr} pts</span>
            </div>

            {/* Base Sum */}
            <div className="flex justify-between items-center px-1 text-slate-400 text-[11px]">
              <span>Base Subtotal</span>
              <span className="font-bold text-slate-200">{baseScore} pts</span>
            </div>

            {/* Synergy Bonus */}
            <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-800/60 flex justify-between items-center">
              <div>
                <span className="text-emerald-200 font-bold">Multi-Trigger Synergy Bonus</span>
                <span className="text-[10px] text-emerald-400 block">{triggerCount} independent triggers aligned</span>
              </div>
              <span className="font-bold text-emerald-300 text-sm">+{synergyBonus} pts</span>
            </div>

            {/* Penalties */}
            {(liqPenalty > 0 || spreadPenalty > 0) && (
              <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-800/60 flex justify-between items-center text-rose-300">
                <span>Penalties (Thin Book / Wide Spread)</span>
                <span className="font-bold">-{liqPenalty + spreadPenalty} pts</span>
              </div>
            )}

            {/* Final Total */}
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-sm font-bold">
              <span className="text-white">Final DeltaRadar Score</span>
              <span className="text-xl text-cyan-400">{finalScore} / 100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
