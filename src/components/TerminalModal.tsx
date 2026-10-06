import React, { useState, useEffect } from 'react';
import { X, Play, Terminal, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCommand?: string;
}

export const TerminalModal: React.FC<TerminalModalProps> = ({
  isOpen,
  onClose,
  initialCommand = 'test',
}) => {
  const [selectedCmd, setSelectedCmd] = useState<string>(initialCommand);
  const [output, setOutput] = useState<string>('');
  const [running, setRunning] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedCmd(initialCommand);
      runCommand(initialCommand);
    }
  }, [isOpen, initialCommand]);

  const runCommand = async (cmd: string) => {
    setRunning(true);
    setOutput(`$ python3 run.py --${cmd === 'test' ? 'test' : 'mode ' + cmd}\nExecuting DeltaRadar process...\n`);
    try {
      const res = await fetch('/api/python/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      const combined = (data.stdout || '') + (data.stderr ? `\n[STDERR]\n${data.stderr}` : '');
      setOutput(`$ ${data.command}\nExit Code: ${data.exitCode}\n\n${combined}`);
    } catch (e: any) {
      setOutput((prev) => prev + `\nExecution Error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const commands = [
    { id: 'test', label: 'Unit Tests (18 Tests)', cmd: 'test' },
    { id: 'dry-run', label: 'Dry-Run Mode', cmd: 'dry-run' },
    { id: 'backtest', label: 'Historical Backtest', cmd: 'backtest' },
    { id: 'calibrate', label: 'Empirical Calibration', cmd: 'calibrate' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Terminal Title Bar */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-bold ml-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>DeltaRadar Terminal Host: python3 run.py</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Copy Output"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Action Buttons */}
        <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          {commands.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCmd(c.cmd);
                runCommand(c.cmd);
              }}
              disabled={running}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50 ${
                selectedCmd === c.cmd
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Play className="w-3 h-3" />
              <span>{c.label}</span>
            </button>
          ))}
          {running && (
            <span className="ml-auto text-amber-400 flex items-center gap-1.5 font-bold animate-pulse text-[11px]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Executing in background...
            </span>
          )}
        </div>

        {/* Terminal Screen */}
        <div className="flex-1 p-4 bg-black/90 overflow-y-auto font-mono text-[12px] text-emerald-400 leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/30">
          {output}
        </div>
      </div>
    </div>
  );
};
