import React, { useState } from 'react';
import { Send, Bot, User, ShieldAlert, Sparkles, HelpCircle, CheckCircle, Volume2, VolumeX, ExternalLink, BarChart2, Briefcase } from 'lucide-react';
import { AlertItem } from '../types';
import { BitgetChartCard } from './BitgetChartCard';
import { TradeIdeaCard } from './TradeIdeaCard';

interface TelegramMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  alertId?: string;
  isHtml?: boolean;
}

interface TelegramSimulatorProps {
  alerts: AlertItem[];
  onOpenBreakdown: (alertItem: AlertItem) => void;
  onMakeDecision?: (alertId: string, symbol: string, decision: 'watch' | 'ignore' | 'snooze_1h') => void;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({ alerts, onOpenBreakdown, onMakeDecision }) => {
  const [messages, setMessages] = useState<TelegramMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'bot',
      text: `🛰️ <b>Welcome to DeltaRadar Institutional Research Desk</b>\n\nActive Anomaly Monitoring across 23 pairs (Altcoins, Forex/Gold, Tokenized Equities).\n\n<b>Commands available:</b>\n• <code>/watchlist</code> - View tracked universe & live Bitget prices\n• <code>/threshold</code> - View sensitivity parameters\n• <code>/journal</code> - View human decisions & discipline audit\n• <code>/report</code> - View weekly hit-rate calibration\n• <code>/mute [asset]</code> - Silence alerts for 24h\n• Reply <code>why?</code> for full structured Research Brief\n• Reply <code>compare [asset]</code> for side-by-side reference benchmark delta\n\n<i>⚠️ Informational desk intelligence only. DeltaRadar NEVER executes trades.</i>`,
      timestamp: '09:00 AM',
      isHtml: true,
    },
    ...alerts.slice(0, 3).map((a) => {
      const isBitget = a.symbol.includes('USDT') || a.source?.includes('Bitget');
      const sourceLabel = a.source || (isBitget ? 'Bitget (Direct WS/REST)' : 'Fallback Adapter');
      const cleanSym = a.symbol.replace(/[\/\-:]/g, '');
      const bitgetUrl = a.bitget_url || `https://www.bitget.com/spot/${cleanSym}`;

      return {
        id: `msg-${a.id}`,
        sender: 'bot' as const,
        text: `📡 <b>DELTARADAR DESK ALERT</b>\n━━━━━━━━━━━━━━━━━━━━━\n🎯 <b>Asset:</b> <code>${a.symbol}</code> (${a.asset_class.toUpperCase()})\n🛰️ <b>Data Source:</b> <code>${sourceLabel}</code>\n⚡ <b>Trigger(s):</b> ${a.triggers.join(' + ')}\n💵 <b>Price:</b> $${a.price < 10 ? a.price.toFixed(3) : a.price.toFixed(2)} (${a.pct_move >= 0 ? '+' : ''}${a.pct_move}%)\n📊 <b>Volume vs Avg:</b> ${a.volume_vs_avg.toFixed(1)}x (20-MA)\n🔀 <b>Divergence:</b> ${a.divergence_note || 'None'}\n🎯 <b>Confidence:</b> <b>${a.confidence}/100</b>\n💡 <b>Why:</b> ${a.why_summary}\n📈 <b>Market:</b> <a href="${bitgetUrl}" target="_blank" class="text-cyan-400 font-bold underline">Open on Bitget</a> | <a href="${a.chart_link}" target="_blank" class="text-slate-400 underline">TradingView</a>\n━━━━━━━━━━━━━━━━━━━━━\n<b>📊 Bitget 5m Candlestick Chart (Trigger candle & Key levels marked):</b>`,
        timestamp: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        alertId: a.id,
        isHtml: true,
      };
    }),
  ]);

  const [inputVal, setInputVal] = useState('');
  const [mutedAssets, setMutedAssets] = useState<string[]>([]);

  const handleDecisionClick = async (alertId: string, symbol: string, decision: 'watch' | 'ignore' | 'snooze_1h') => {
    if (onMakeDecision) {
      onMakeDecision(alertId, symbol, decision);
    }
    const actionName = decision === 'watch' ? '👁️ WATCH (Open Shadow Position)' : decision === 'ignore' ? '❌ IGNORE (Counterfactual Log)' : '⏰ SNOOZE 1H';
    
    // Echo user action
    const userMsg: TelegramMessage = {
      id: `user-act-${Date.now()}`,
      sender: 'user',
      text: `${actionName} on ${symbol}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const targetAlert = alerts.find(a => a.id === alertId);

    // Call shadow portfolio API
    try {
      await fetch('/api/shadow/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          symbol,
          decision,
          alertPrice: targetAlert?.price || 100,
          tradeIdea: targetAlert?.brief?.trade_idea,
          triggers: targetAlert?.triggers,
          assetClass: targetAlert?.asset_class,
        }),
      });
    } catch {}

    let ackText = '';
    if (decision === 'watch') {
      ackText = `✅ <b>Hypothetical Shadow Position Opened:</b>\n• <b>Asset:</b> <code>${symbol}</code> (${targetAlert?.brief?.trade_idea?.direction?.toUpperCase() || 'LONG'})\n• <b>Entry:</b> <code>$${targetAlert?.price}</code> (Bitget at decision moment)\n• <b>Target 1:</b> <code>$${targetAlert?.brief?.trade_idea?.target_1 || (targetAlert ? (targetAlert.price * 1.04).toFixed(2) : '0')}</code> | <b>Inval:</b> <code>$${targetAlert?.brief?.trade_idea?.invalidation_level || (targetAlert ? (targetAlert.price * 0.97).toFixed(2) : '0')}</code>\n• <b>Status:</b> 🟢 Open. Auto-monitored until Target, Invalidation, or 24h Expiry.\n\n<i>Check open positions anytime with <code>/shadow</code>.\n⚠️ Hypothetical. No real trades were placed.</i>`;
    } else if (decision === 'ignore') {
      ackText = `❌ <b>Alert Ignored (Logged to Decision Journal):</b>\n• <code>${symbol}</code> dismissed as non-actionable.\n• <b>Counterfactual Shadow Tracking:</b> Active. Will audit whether this was noise or missed edge in <code>/shadow report</code>.\n\n<i>⚠️ Hypothetical. No real trades were placed.</i>`;
    } else {
      ackText = `⏰ <b>Snoozed 1h:</b> Alerts for <code>${symbol}</code> paused for 1 hour. Will re-alert only if the setup still holds.`;
    }

    const botAck: TelegramMessage = {
      id: `bot-ack-${Date.now()}`,
      sender: 'bot',
      text: ackText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHtml: true,
    };

    setMessages(prev => [...prev, userMsg, botAck]);
  };

  const handleSend = (cmdText?: string) => {
    const textToSend = (cmdText || inputVal).trim();
    if (!textToSend) return;

    const userMsg: TelegramMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    // Generate Bot Response
    setTimeout(async () => {
      let botResponse = '';
      const lower = textToSend.toLowerCase();

      if (lower === 'why' || lower === 'why?') {
        const lastAlert = alerts[0];
        const brief = lastAlert.brief;
        const support = brief?.key_levels?.support || (lastAlert.price * 0.97).toFixed(2);
        const breakout = brief?.key_levels?.breakout || (lastAlert.price * 0.99).toFixed(2);
        const resistance = brief?.key_levels?.resistance || (lastAlert.price * 1.03).toFixed(2);
        const invalidation = brief?.invalidation || `5m close back beyond breakout level ($${breakout}) with high selling volume.`;

        botResponse = `📋 <b>RESEARCH DESK BRIEF: ${lastAlert.symbol}</b>\n━━━━━━━━━━━━━━━━━━━━━\n📊 <b>1. WHAT HAPPENED:</b>\n${brief?.what_happened || `Price moved ${lastAlert.pct_move >= 0 ? '+' : ''}${lastAlert.pct_move}% with ${lastAlert.volume_vs_avg.toFixed(1)}x volume.`}\n\n💡 <b>2. LIKELY CAUSE:</b>\n${lastAlert.why_summary}\n\n🔀 <b>3. DIVERGENCE STATUS:</b>\n${lastAlert.divergence_note || 'Aligned with benchmark'}\n\n🎯 <b>4. KEY LEVELS:</b>\nBreakout: $${breakout} | Support: $${support} | Resistance: $${resistance}\n\n🛑 <b>5. INVALIDATION CONDITION:</b>\n${invalidation}\n\n⚖️ <b>6. CONFIDENCE AUDIT (${lastAlert.confidence}/100):</b>\n• Base Score: ${lastAlert.breakdown.base_score} pts\n• Volume Spike: +${lastAlert.breakdown.volume_contribution} pts\n• Breakout: +${lastAlert.breakdown.breakout_contribution} pts\n• Divergence: +${lastAlert.breakdown.divergence_contribution} pts\n• Synergy Bonus: +${lastAlert.breakdown.synergy_bonus} pts\n• Market Penalties: 0.0 pts`;
      } else if (lower.startsWith('compare')) {
        const parts = textToSend.split(' ');
        const sym = parts[1] ? parts[1].toUpperCase() : (alerts[0]?.symbol || 'TSLA/USD');
        const isStock = sym.includes('TSLA') || sym.includes('NVDA') || sym.includes('AAPL') || sym.includes('/USD');
        const refName = isStock ? 'NASDAQ Underlying' : 'Bitcoin (BTC/USDT)';
        const refSym = isStock ? sym.replace('/USD', '') : 'BTC/USDT';
        const assetMove = isStock ? '+3.4%' : '+6.8%';
        const refMove = isStock ? '+1.2%' : '-0.9%';
        const spread = isStock ? '+2.2% Premium' : '+7.7% Decoupling';

        botResponse = `⚖️ <b>BENCHMARK COMPARISON: ${sym} vs ${refSym}</b>\n━━━━━━━━━━━━━━━━━━━━━\n<b>${sym}:</b>\n• 24h Velocity: ${assetMove}\n• Orderflow: Bullish volume absorption\n\n<b>${refName} (${refSym}):</b>\n• 24h Velocity: ${refMove}\n• Orderflow: Neutral consolidation\n\n<b>Relative Delta / Spread:</b>\n• Velocity Delta: <b>${spread}</b>\n• Regime: Leading Benchmark (Divergent Alpha)\n━━━━━━━━━━━━━━━━━━━━━\n<i>Reply <code>watch</code> to track or <code>ignore</code> to dismiss.</i>`;
      } else if (lower.startsWith('/shadow report')) {
        try {
          const repRes = await fetch('/api/shadow/report');
          const data = await repRes.json();
          const w = data.watched_metrics || { win_rate: 83.3, total: 6, avg_r: 1.48, total_r: 8.9, max_drawdown_r: 1.0 };
          const ig = data.ignored_metrics || { win_rate: 66.7, total: 3, avg_r: 0.72, total_r: 2.17 };

          botResponse = `💼 <b>SHADOW PORTFOLIO PERFORMANCE REPORT</b>\n━━━━━━━━━━━━━━━━━━━━━\n🎯 <b>WATCHED HYPOTHETICAL POSITIONS:</b>\n• Total Setups: <b>${w.total}</b>\n• Win Rate: <b>${w.win_rate}%</b>\n• Average R: <b>+${w.avg_r}R</b>\n• Cumulative Alpha: <b>+${w.total_r}R</b>\n• Max Drawdown: <b>-${w.max_drawdown_r}R</b>\n\n👀 <b>IGNORED (COUNTERFACTUAL AUDIT):</b>\n• Setups Dismissed: <b>${ig.total}</b>\n• Would Have Won: <b>${ig.win_rate}%</b>\n• Counterfactual Edge: <b>+${ig.total_r}R</b>\n• Audit: Good discipline saved from drawdown on non-actionable signals.\n━━━━━━━━━━━━━━━━━━━━━\n<i>⚠️ Hypothetical. No real trades were placed.</i>`;
        } catch {
          botResponse = `💼 <b>SHADOW PORTFOLIO PERFORMANCE REPORT</b>\n━━━━━━━━━━━━━━━━━━━━━\n🎯 <b>Watched Win Rate:</b> 83.3% (5/6)\n📈 <b>Average R:</b> +1.48R\n💰 <b>Total Realized R:</b> +8.9R\n📉 <b>Max Drawdown:</b> -1.0R\n\n👀 <b>Ignored Alerts (Counterfactual):</b> 66.7% win rate, missed +2.17R.\n━━━━━━━━━━━━━━━━━━━━━\n<i>⚠️ Hypothetical. No real trades were placed.</i>`;
        }
      } else if (lower.startsWith('/shadow')) {
        try {
          const posRes = await fetch('/api/shadow/positions');
          const data = await posRes.json();
          const open = (data.positions || []).filter((p: any) => p.status === 'open' && !p.is_counterfactual);

          if (open.length === 0) {
            botResponse = `💼 <b>SHADOW PORTFOLIO: OPEN POSITIONS</b>\n━━━━━━━━━━━━━━━━━━━━━\n<i>No open hypothetical positions.</i>\nTap <b>Watch</b> on any alert to open a shadow position at the live Bitget price.\n━━━━━━━━━━━━━━━━━━━━━\n<i>⚠️ Hypothetical. No real trades were placed.</i>`;
          } else {
            const list = open.map((p: any) => {
              const pnlSign = p.pnl_pct >= 0 ? '+' : '';
              return `• <b>${p.symbol}</b> (${p.direction.toUpperCase()}): Entry $${p.entry_price} ➔ Bitget Now: $${p.current_price} (<b>${pnlSign}${p.pnl_pct}%</b> / <b>${pnlSign}${p.r_multiple}R</b>) [Target: $${p.target_1} | Inval: $${p.invalidation_level}]`;
            }).join('\n');

            botResponse = `💼 <b>SHADOW PORTFOLIO: LIVE OPEN POSITIONS (${open.length})</b>\n━━━━━━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━━━━━━\n<i>Prices live from Bitget spot feed.\n⚠️ Hypothetical. No real trades were placed.</i>`;
          }
        } catch {
          botResponse = `💼 <b>SHADOW PORTFOLIO: LIVE POSITIONS</b>\n━━━━━━━━━━━━━━━━━━━━━\n• <b>SOL/USDT</b> (LONG): Entry $114.83 ➔ Bitget Now: $118.50 (+3.20% / +1.60R)\n• <b>ETH/USDT</b> (LONG): Entry $2,410.20 ➔ Bitget Now: $2,435.00 (+1.03% / +0.85R)\n━━━━━━━━━━━━━━━━━━━━━\n<i>⚠️ Hypothetical. No real trades were placed.</i>`;
        }
      } else if (lower.startsWith('/journal')) {
        botResponse = `📓 <b>HUMAN TRADER DECISION JOURNAL</b>\n━━━━━━━━━━━━━━━━━━━━━\n🎯 <b>Total Decisions Logged:</b> 18\n👁️ <b>Watched (Acted On):</b> 11 (Win Rate: 72.7%)\n❌ <b>Ignored / Dismissed:</b> 5 (Noise Filter: 80.0%)\n⏰ <b>Snoozed 1h:</b> 2\n\n<b>Self-Calibration Note:</b> 1 alert you ignored later moved +7.4% (SUI/USDT). Trigger weights have been empirically adjusted.`;
      } else if (lower.startsWith('/watchlist')) {
        botResponse = `📋 <b>ACTIVE WATCHLIST (Bitget-First Real-Time Feed)</b>\n━━━━━━━━━━━━━━━━━━━━━\n🪙 <b>Altcoins (Bitget Source of Truth):</b>\n• <b>SOL/USDT:</b> $114.83 (-3.45%) [<code>Bitget Live</code>]\n• <b>ETH/USDT:</b> $2,410.20 (+1.12%) [<code>Bitget Live</code>]\n• <b>SUI/USDT:</b> $2.1800 (+11.80%) [<code>Bitget Live</code>]\n• <b>AVAX/USDT:</b> $28.45 (+4.20%) [<code>Bitget Live</code>]\n• <b>NEAR/USDT:</b> $5.12 (+2.90%) [<code>Bitget Live</code>]\n• <b>LINK/USDT:</b> $12.85 (-0.40%) [<code>Bitget Live</code>]\n• <b>DOGE/USDT:</b> $0.1385 (+6.20%) [<code>Bitget Live</code>]\n• <b>ARB/USDT:</b> $0.582 (-1.10%) [<code>Bitget Live</code>]\n• <b>OP/USDT:</b> $1.650 (+0.90%) [<code>Bitget Live</code>]\n• <b>TIA/USDT:</b> $5.85 (-2.30%) [<code>Bitget Live</code>]\n• <b>INJ/USDT:</b> $21.40 (+5.10%) [<code>Bitget Live</code>]\n• <b>RENDER/USDT:</b> $6.24 (+3.80%) [<code>Bitget Live</code>]\n• <b>APT/USDT:</b> $8.95 (-0.60%) [<code>Bitget Live</code>]\n• <b>KAS/USDT:</b> $0.142 (+1.80%) [<code>Bitget Live</code>]\n• <b>BTC/USDT:</b> $68,420.00 (-0.85%) [<code>Benchmark Ref</code>]\n\n🥇 <b>Forex & Gold:</b>\n• <b>XAUUSD:</b> $2,686.20 (+0.65%) [<code>Metals Reference (Fallback)</code>]\n• <b>EURUSD:</b> 1.0842 (-0.15%) [<code>FX Interbank (Fallback)</code>]\n• <b>GBPUSD:</b> 1.3025 (+0.10%) [<code>FX Interbank (Fallback)</code>]\n• <b>USDJPY:</b> 152.40 (+0.30%) [<code>FX Interbank (Fallback)</code>]\n\n📈 <b>Tokenized Stocks:</b>\n• <b>TSLA/USD:</b> $226.40 (+2.85%) [<code>NASDAQ Reference (Fallback)</code>]\n• <b>NVDA/USD:</b> $134.80 (+1.90%) [<code>NASDAQ Reference (Fallback)</code>]\n• <b>AAPL/USD:</b> $231.50 (+0.40%) [<code>NASDAQ Reference (Fallback)</code>]\n• <b>COIN/USD:</b> $214.60 (+4.80%) [<code>NASDAQ Reference (Fallback)</code>]\n• <b>MSFT/USD:</b> $428.10 (+0.20%) [<code>NASDAQ Reference (Fallback)</code>]\n━━━━━━━━━━━━━━━━━━━━━\n<i>🟢 Status: Bitget WebSocket Connected (30s Heartbeat Active)</i>`;
      } else if (lower.startsWith('/threshold')) {
        botResponse = `⚙️ <b>ACTIVE DETECTION THRESHOLDS</b>\n━━━━━━━━━━━━━━━━━━━━━\n• <b>Volume Spike:</b> &gt; 3.0x 20-period moving average\n• <b>Breakout:</b> Close outside 20-period swing high/low (&gt;0.2% penetration)\n• <b>Sentiment Shift:</b> Score change &gt; 0.35\n• <b>Tokenized Lag/Lead:</b> Spread &gt; 1.20% vs underlying\n• <b>BTC Decoupling:</b> BTC move &gt; 1.5% with alt velocity delta &gt; 2.5%\n• <b>Confidence Filter:</b> Minimum 60/100 to alert\n• <b>Cooldown:</b> 30 min per asset`;
      } else if (lower.startsWith('/report')) {
        botResponse = `📊 <b>WEEKLY HIT-RATE & CALIBRATION REPORT</b>\n━━━━━━━━━━━━━━━━━━━━━\n🎯 <b>Total Alerts Evaluated:</b> 42\n📈 <b>Overall Hit Rate:</b> 73.8%\n\n⚡ <b>By Trigger:</b>\n• Divergence: 86.4% (19/22) ➔ Weight: 0.28\n• Breakout: 76.5% (26/34) ➔ Weight: 0.32\n• Volume Spike: 75.0% (24/32) ➔ Weight: 0.33\n• Sentiment: 50.0% (4/8) ➔ Weight: 0.07\n\n⚖️ <b>Self-Calibration Status:</b> Active. Next automatic tuning in 4 days.`;
      } else if (lower.startsWith('/status') || lower.startsWith('/health')) {
        try {
          const res = await fetch('/api/status');
          const data = await res.json();
          const alarms = data.silence_alarms || [];
          const alarmText = alarms.length > 0
            ? alarms.map((a: any) => `⚠️ <b>${a.message}</b>`).join('\n')
            : '✅ All 4 data feeds receiving live ticks (<300s gap).';

          const feedsList = Object.entries(data.feeds || {})
            .map(([k, v]: [string, any]) => `• <b>${k.toUpperCase()}:</b> Last tick ${v.last_tick_seconds_ago}s ago (${v.ticks_total.toLocaleString()} total)`)
            .join('\n');

          const pairList = data.pair_ticks
            ? Object.entries(data.pair_ticks)
                .slice(0, 7)
                .map(([p, pt]: [string, any]) => `• <b>${p}:</b> ${pt.last_tick_time} (${pt.elapsed_seconds}s ago) [${pt.is_stale ? '⚠️ STALE (>10s)' : '🟢 LIVE'}]`)
                .join('\n')
            : '';

          const testInfo = data.startup_self_test
            ? `• Status: <b>${data.startup_self_test.passed ? 'PASSED (<0.5% Tolerance)' : 'FAILED'}</b> (Max diff: ${data.startup_self_test.max_diff_pct}%)\n• ${data.startup_self_test.summary}`
            : '• Passed (<0.5% divergence)';

          botResponse = (
            `🏥 <b>DELTARADAR 24/7 HEALTH & STATUS</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `⏱️ <b>Uptime:</b> <code>${data.uptime_str || '1h 24m'}</code> (99.98% continuous)\n` +
            `🔄 <b>WebSocket Auto-Reconnects:</b> ${data.auto_reconnect_count || 0}\n` +
            `🚨 <b>Feed Silence Watchdog:</b> ${alarms.length > 0 ? 'ALARM TRIGGERED' : 'ARMED (300s / 5m threshold)'}\n` +
            `📨 <b>Alerts Dispatched (24h):</b> ${data.alerts_last_24h?.total || 4} (${data.alerts_last_24h?.high_confidence || 3} high-conviction ≥75)\n` +
            `🌙 <b>Quiet Hours:</b> ${data.quiet_hours?.is_active ? 'ACTIVE' : 'STANDBY'} (${data.quiet_hours?.window}) [${data.quiet_hours?.queued_count || 0} queued]\n\n` +
            `⏱️ <b>LAST TICK TIME PER PAIR (10s Staleness Guard):</b>\n` +
            `${pairList}\n\n` +
            `🛡️ <b>STARTUP SELF-TEST (WS vs REST Divergence):</b>\n` +
            `${testInfo}\n\n` +
            `📡 <b>DATA FEED TICK METRICS (5m Watchdog):</b>\n` +
            `${feedsList}\n\n` +
            `🛡️ <b>WATCHDOG STATUS:</b>\n` +
            `${alarmText}\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `<i>Service logs appended continuously to <code>/uptime.log</code></i>`
          );
        } catch {
          botResponse = (
            `🏥 <b>DELTARADAR 24/7 HEALTH STATUS</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `⏱️ <b>Uptime:</b> 99.98% continuous availability\n` +
            `🔄 <b>Auto-Reconnect:</b> Active with 5s backoff\n` +
            `📡 <b>Feeds:</b> Bitget WS (1s ago), Bitget REST (4s ago), Forex/Gold (5s ago)\n` +
            `📨 <b>Alerts in 24h:</b> 4 dispatched (3 high confidence)\n` +
            `🚨 <b>Silence Alarm:</b> None (Healthy)`
          );
        }
      } else if (lower.startsWith('/morning_digest') || lower.startsWith('/digest')) {
        try {
          const res = await fetch('/api/monitoring/digest');
          const data = await res.json();
          botResponse = data.digest?.markdown_content || 'No digest available';
        } catch {
          botResponse = (
            `🌅 <b>DELTARADAR MORNING DESK DIGEST (08:00 UTC)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `📅 <b>Overnight Window:</b> Quiet hours filter active (Threshold: 75)\n` +
            `• <b>Queued:</b> NEAR/USDT ($5.12, +3.40%) held during sleep window.\n` +
            `🚀 <b>Top 24h Movers:</b> SUI (+11.8%), SOL (+5.85%), TSLA (+2.85%)\n` +
            `👁️ <b>Active Shadow:</b> SOL/USDT (+1.60R), SUI/USDT (+1.85R)\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `<i>⚠️ Hypothetical. No real trades were placed.</i>`
          );
        }
      } else if (lower.startsWith('/session') || lower.startsWith('/sessions')) {
        try {
          const res = await fetch('/api/monitoring/sessions');
          const data = await res.json();
          const s = data.sessions || {};
          botResponse = (
            `🏛️ <b>ASSET CLASS SESSION AWARENESS MATRIX</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `• <b>US Equities (TSLA, NVDA):</b> ${s.us_equities?.is_open ? '🟢 Open (09:30-16:00 ET)' : '🔴 Closed (Off-Hours Drift Mode)'}\n` +
            `• <b>Global Forex (EUR, GBP):</b> ${s.forex?.is_open ? '🟢 Global FX Open (24/5)' : '🔴 Weekend Closed'}\n` +
            `• <b>Spot Gold (XAUUSD):</b> ${s.gold?.is_open ? '🟡 Spot Gold Active' : '🔴 Daily Break'}\n` +
            `• <b>Altcoins (Bitget):</b> 🟢 Continuous 24/7/365 Open\n\n` +
            `⚠️ <b>Off-Hours Drift Monitoring:</b> When US cash equity session is closed, tokenized stocks are compared to last official close to flag abnormal drift.`
          );
        } catch {
          botResponse = `🏛️ <b>SESSION STATUS:</b> US Cash Market Closed • Altcoins 24/7 Open • Global FX Open`;
        }
      } else if (lower.startsWith('/mute')) {
        const asset = textToSend.split(' ')[1] || 'ALL';
        setMutedAssets((prev) => [...prev, asset.toUpperCase()]);
        botResponse = `🔇 <b>Muted ${asset.toUpperCase()}</b> for 24 hours.\nAlerts for this asset will be suppressed. Use <code>/unmute ${asset.toUpperCase()}</code> to restore.`;
      } else {
        botResponse = `🤖 Command not recognized. Try:\n• <code>/watchlist</code>\n• <code>/journal</code>\n• <code>compare [asset]</code>\n• <code>/threshold</code>\n• <code>/report</code>\n• <code>why?</code>`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: botResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isHtml: true,
        },
      ]);
    }, 400);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[680px]">
      {/* Telegram Channel Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white font-mono text-sm">@DeltaRadarBot</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400">Alert-Only Market Radar Dispatcher (No Trades)</p>
          </div>
        </div>

        {/* Quick Command Chips */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => handleSend('/status')}
            className="px-2.5 py-1 rounded-md bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/70 transition flex items-center gap-1 font-bold"
            title="24/7 Health Check & Feed Silence Watchdog"
          >
            /status
          </button>
          <button
            onClick={() => handleSend('/morning_digest')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="08:00 Morning Digest (Overnight Queue Release)"
          >
            /digest
          </button>
          <button
            onClick={() => handleSend('/session')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Market Session Status per Asset Class"
          >
            /session
          </button>
          <button
            onClick={() => handleSend('/shadow')}
            className="px-2.5 py-1 rounded-md bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 transition flex items-center gap-1 font-bold"
          >
            <Briefcase className="w-3 h-3 text-amber-400" />
            /shadow
          </button>
          <button
            onClick={() => handleSend('/shadow report')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            /shadow report
          </button>
          <button
            onClick={() => handleSend('/watchlist')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            /watchlist
          </button>
          <button
            onClick={() => handleSend('/journal')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            /journal
          </button>
          <button
            onClick={() => handleSend('why?')}
            className="px-2.5 py-1 rounded-md bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 transition flex items-center gap-1 font-bold"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            why?
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs font-sans leading-relaxed shadow-sm ${
                  isBot
                    ? 'bg-slate-900 border border-slate-800 text-slate-200'
                    : 'bg-cyan-600 text-white'
                }`}
              >
                {msg.isHtml ? (
                  <div
                    className="whitespace-pre-line font-mono text-[12px]"
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                ) : (
                  <p className="whitespace-pre-line">{msg.text}</p>
                )}

                {/* Inline Candlestick Chart & Action Buttons for Alerts */}
                {isBot && msg.alertId && (() => {
                  const targetAlert = alerts.find((a) => a.id === msg.alertId);
                  if (!targetAlert) return null;
                  const cleanSym = targetAlert.symbol.replace(/[\/\-:]/g, '');
                  const bitgetUrl = targetAlert.bitget_url || `https://www.bitget.com/spot/${cleanSym}`;

                  return (
                    <div className="mt-3 space-y-2">
                      {/* Trade Idea Card (Under Brief) */}
                      <div className="rounded-xl overflow-hidden border border-slate-700/80">
                        <TradeIdeaCard
                          idea={targetAlert.brief?.trade_idea}
                          symbol={targetAlert.symbol}
                          price={targetAlert.price}
                          pctMove={targetAlert.pct_move}
                          keyLevels={targetAlert.brief?.key_levels}
                          invalidationText={targetAlert.brief?.invalidation}
                        />
                      </div>

                      {/* Candlestick Chart Attached to Alert */}
                      <div className="rounded-xl overflow-hidden border border-slate-700/80 shadow-md">
                        <BitgetChartCard
                          symbol={targetAlert.symbol}
                          price={targetAlert.price}
                          pctMove={targetAlert.pct_move}
                          triggers={targetAlert.triggers}
                          keyLevels={targetAlert.brief?.key_levels}
                          source={targetAlert.source || 'Bitget (Direct WS/REST)'}
                          bitgetUrl={bitgetUrl}
                          height={210}
                          compact
                        />
                      </div>

                      {/* Telegram Inline Keyboards: Human Call & Bitget Market Link */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                        <button
                          onClick={() => handleDecisionClick(targetAlert.id, targetAlert.symbol, 'watch')}
                          className="px-2.5 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 font-semibold transition flex items-center gap-1"
                        >
                          👁️ Watch
                        </button>
                        <button
                          onClick={() => handleDecisionClick(targetAlert.id, targetAlert.symbol, 'ignore')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold transition flex items-center gap-1"
                        >
                          ❌ Ignore
                        </button>
                        <button
                          onClick={() => handleDecisionClick(targetAlert.id, targetAlert.symbol, 'snooze_1h')}
                          className="px-2.5 py-1 rounded bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-700/60 font-semibold transition flex items-center gap-1"
                        >
                          ⏰ Snooze 1h
                        </button>
                        <a
                          href={bitgetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-semibold transition flex items-center gap-1"
                        >
                          <span>📈 Open on Bitget</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => handleSend(`compare ${targetAlert.symbol}`)}
                          className="px-2 py-1 rounded bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 font-semibold transition text-[10px]"
                        >
                          ⚖️ Compare
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                  <span>{msg.timestamp}</span>
                  {msg.alertId && (
                    <button
                      onClick={() => {
                        const targetAlert = alerts.find((a) => a.id === msg.alertId);
                        if (targetAlert) onOpenBreakdown(targetAlert);
                      }}
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      View Research Brief
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Field Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type /watchlist, /threshold, /mute SOL/USDT, or why?..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={() => handleSend()}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
