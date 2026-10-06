import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Filter, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { OutcomeItem } from '../types';

interface OutcomeTrackerViewProps {
  outcomes: OutcomeItem[];
}

export const OutcomeTrackerView: React.FC<OutcomeTrackerViewProps> = ({ outcomes }) => {
  const [filterClass, setFilterClass] = useState<string>('all');

  const filtered = outcomes.filter((o) => {
    if (filterClass !== 'all' && o.asset_class !== filterClass) return false;
    return true;
  });

  const totalHits = outcomes.reduce((acc, o) => {
    let count = 0;
    if (o.hit_1h) count++;
    if (o.hit_4h) count++;
    if (o.hit_24h) count++;
    return acc + count;
  }, 0);

  const totalEvaluations = outcomes.reduce((acc, o) => {
    let count = 0;
    if (o.hit_1h !== undefined) count++;
    if (o.hit_4h !== undefined) count++;
    if (o.hit_24h !== undefined) count++;
    return acc + count;
  }, 0);

  const hitRate = totalEvaluations > 0 ? ((totalHits / totalEvaluations) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-mono block">TOTAL OUTCOMES TRACKED</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">{outcomes.length} Alerts</span>
          <span className="text-[11px] text-slate-500 font-mono">Recorded in SQLite</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-mono block">AGGREGATE HIT RATE</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">{hitRate}%</span>
          <span className="text-[11px] text-slate-500 font-mono">{totalHits} hits / {totalEvaluations} checked windows</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-mono block">EVALUATION HORIZONS</span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">+1h / +4h / +24h</span>
          <span className="text-[11px] text-slate-500 font-mono">Fixed post-alert checks</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-mono block">MIN HIT THRESHOLDS</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">&gt; 1.2% / 2.5% / 4.5%</span>
          <span className="text-[11px] text-slate-500 font-mono">In predicted alert direction</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono font-bold text-slate-300">Filter Asset Sector:</span>
          {['all', 'altcoin', 'forex_gold', 'tokenized_stock'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterClass(f)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                filterClass === f
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.toUpperCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] border-b border-slate-800 uppercase">
              <tr>
                <th className="py-3 px-4">Asset &amp; Triggers</th>
                <th className="py-3 px-3">Price at Alert</th>
                <th className="py-3 px-3 text-center">+1h Horizon</th>
                <th className="py-3 px-3 text-center">+4h Horizon</th>
                <th className="py-3 px-3 text-center">+24h Horizon</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((item) => (
                <tr key={item.alert_id} className="hover:bg-slate-850/50 transition">
                  {/* Asset */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-sm text-white">{item.symbol}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.triggers.map((t, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Alert Price */}
                  <td className="py-3.5 px-3">
                    <span className="font-bold text-slate-200">
                      ${item.alert_price < 10 ? item.alert_price.toFixed(3) : item.alert_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Score: {item.confidence}/100
                    </span>
                  </td>

                  {/* +1h */}
                  <td className="py-3.5 px-3 text-center">
                    {item.hit_1h !== undefined ? (
                      <div className="inline-flex flex-col items-center">
                        <span className={`inline-flex items-center gap-1 font-bold ${item.hit_1h ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.hit_1h ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {item.move_pct_1h ? (item.move_pct_1h >= 0 ? '+' : '') + item.move_pct_1h.toFixed(2) + '%' : '0.0%'}
                        </span>
                        <span className="text-[10px] text-slate-400">${item.price_1h?.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                  </td>

                  {/* +4h */}
                  <td className="py-3.5 px-3 text-center">
                    {item.hit_4h !== undefined ? (
                      <div className="inline-flex flex-col items-center">
                        <span className={`inline-flex items-center gap-1 font-bold ${item.hit_4h ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.hit_4h ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {item.move_pct_4h ? (item.move_pct_4h >= 0 ? '+' : '') + item.move_pct_4h.toFixed(2) + '%' : '0.0%'}
                        </span>
                        <span className="text-[10px] text-slate-400">${item.price_4h?.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                  </td>

                  {/* +24h */}
                  <td className="py-3.5 px-3 text-center">
                    {item.hit_24h !== undefined ? (
                      <div className="inline-flex flex-col items-center">
                        <span className={`inline-flex items-center gap-1 font-bold ${item.hit_24h ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.hit_24h ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {item.move_pct_24h ? (item.move_pct_24h >= 0 ? '+' : '') + item.move_pct_24h.toFixed(2) + '%' : '0.0%'}
                        </span>
                        <span className="text-[10px] text-slate-400">${item.price_24h?.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.resolved
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}
                    >
                      {item.resolved ? 'RESOLVED' : 'TRACKING'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
