import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Check, AlertCircle, FileCode } from 'lucide-react';

interface ConfigEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSavedNotification?: () => void;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({ isOpen, onClose, onSavedNotification }) => {
  const [yamlContent, setYamlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setYamlContent(data.yaml);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to load config.yaml' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Error connecting to server' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml: yamlContent }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'config.yaml successfully saved and reloaded!' });
        if (onSavedNotification) onSavedNotification();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save configuration' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Error saving file' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white">config.yaml Live Editor</h2>
              <p className="text-xs text-slate-400">
                Modify watchlist pairs, sensitivity thresholds, and trigger weights dynamically
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchConfig}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Reset to Disk State"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`px-4 py-2 text-xs font-mono flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-b border-emerald-800'
                : 'bg-rose-950/60 text-rose-300 border-b border-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Code Editor Body */}
        <div className="flex-1 p-4 bg-slate-950/70 overflow-hidden flex flex-col font-mono text-xs">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Loading config.yaml...
            </div>
          ) : (
            <textarea
              value={yamlContent}
              onChange={(e) => setYamlContent(e.target.value)}
              className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500 resize-none selection:bg-cyan-500/30"
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Reloads instantly into the live anomaly engine without restarts.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-600/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
