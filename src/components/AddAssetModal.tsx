import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  Coins,
  DollarSign,
  HelpCircle,
  Layers,
  LineChart,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { AssetBadge, AssetClassCategory } from './AssetBadge';
import { WatchlistItem } from '../hooks/useWatchlist';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: WatchlistItem[];
  onAddAsset: (item: WatchlistItem) => boolean;
  onRemoveAsset: (symbol: string) => void;
  onMoveAsset: (index: number, direction: 'up' | 'down') => void;
  onResetDefaults: () => void;
  onSelectAsset?: (symbol: string) => void;
}

interface BitgetSymbolItem {
  symbol: string;
  name: string;
  baseCoin: string;
  quoteCoin: string;
  assetClass: AssetClassCategory;
  source: string;
  marketType?: 'spot' | 'futures';
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  onAddAsset,
  onRemoveAsset,
  onMoveAsset,
  onResetDefaults,
  onSelectAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [selectedClass, setSelectedClass] = useState<AssetClassCategory>('crypto');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Symbol catalog state
  const [symbols, setSymbols] = useState<BitgetSymbolItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cfdNotAvailable, setCfdNotAvailable] = useState<boolean>(false);

  // Fetch symbols when selected category changes
  useEffect(() => {
    if (!isOpen) return;

    if (selectedClass === 'cfd') {
      setCfdNotAvailable(true);
      setSymbols([]);
      setLoading(false);
      return;
    }

    setCfdNotAvailable(false);
    setLoading(true);
    setError(null);

    const apiCategory =
      selectedClass === 'stock' ? 'stock' : selectedClass === 'gold_forex' ? 'gold_forex' : 'crypto';

    fetch(`/api/bitget/symbols?category=${apiCategory}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.symbols)) {
          setSymbols(data.symbols);
        } else if (data.available === false) {
          setCfdNotAvailable(true);
          setSymbols([]);
        } else {
          setError(data.error || 'Failed to load symbols from Bitget official catalog');
        }
      })
      .catch((err) => {
        setError(err.message || 'Network error fetching symbols');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, selectedClass]);

  // Filtered symbols based on user search query
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) {
      return symbols.slice(0, 80); // Display top 80 by default for speed
    }
    const q = searchQuery.trim().toUpperCase();
    return symbols
      .filter(
        (s) =>
          s.symbol.toUpperCase().includes(q) ||
          s.baseCoin.toUpperCase().includes(q) ||
          (s.name && s.name.toUpperCase().includes(q))
      )
      .slice(0, 100);
  }, [symbols, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold font-mono text-slate-100 tracking-tight">
                Watchlist &amp; Asset Catalog
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Bitget Official
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Verified Bitget instruments only · Add, remove, and reorder assets
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher: Add Asset vs Manage Current Watchlist */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold border-b-2 transition-colors ${
                activeTab === 'add'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Asset</span>
            </button>

            <button
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold border-b-2 transition-colors ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Reorder &amp; Remove ({watchlist.length})</span>
            </button>
          </div>

          {activeTab === 'manage' && (
            <button
              onClick={onResetDefaults}
              className="text-[11px] font-mono text-slate-400 hover:text-blue-400 transition-colors"
            >
              Reset to Defaults
            </button>
          )}
        </div>

        {/* Tab 1: ADD ASSET VIEW */}
        {activeTab === 'add' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Asset-Class Picker */}
            <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/20">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                1. Select Asset Class
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Crypto */}
                <button
                  onClick={() => setSelectedClass('crypto')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border font-mono text-xs transition-all ${
                    selectedClass === 'crypto'
                      ? 'bg-blue-600/15 border-blue-500 text-blue-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Coins className="w-4 h-4 shrink-0 text-blue-400" />
                  <div className="text-left min-w-0">
                    <span className="block truncate">Crypto</span>
                    <span className="text-[10px] text-slate-500 block">Spot pairs</span>
                  </div>
                </button>

                {/* Tokenized Stock */}
                <button
                  onClick={() => setSelectedClass('stock')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border font-mono text-xs transition-all ${
                    selectedClass === 'stock'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0 text-cyan-400" />
                  <div className="text-left min-w-0">
                    <span className="block truncate">Stock</span>
                    <span className="text-[10px] text-slate-500 block">Tokenized Equities</span>
                  </div>
                </button>

                {/* Gold / Forex */}
                <button
                  onClick={() => setSelectedClass('gold_forex')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border font-mono text-xs transition-all ${
                    selectedClass === 'gold_forex'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                  <div className="text-left min-w-0">
                    <span className="block truncate">Gold / Forex</span>
                    <span className="text-[10px] text-slate-500 block">Metals &amp; FX</span>
                  </div>
                </button>

                {/* CFD (Unavailable on Bitget) */}
                <button
                  onClick={() => setSelectedClass('cfd')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border font-mono text-xs transition-all ${
                    selectedClass === 'cfd'
                      ? 'bg-orange-500/15 border-orange-500 text-orange-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-orange-400" />
                  <div className="text-left min-w-0">
                    <span className="block truncate">CFD</span>
                    <span className="text-[10px] text-slate-500 block">Not on Bitget</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Search Box */}
            {!cfdNotAvailable && (
              <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-900/60">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${
                      selectedClass === 'stock'
                        ? 'tokenized stocks (e.g. TSLA, NVDA, AAPL, COIN)...'
                        : selectedClass === 'gold_forex'
                        ? 'gold/forex (e.g. PAXG, XAUT, XAU, EUR)...'
                        : 'crypto pairs (e.g. SOL, BTC, ETH, SUI)...'
                    }`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2 px-1">
                  <span>
                    Source: <strong className="text-slate-400">Bitget Official Public API</strong>
                  </span>
                  <span>
                    Showing {filteredSymbols.length} of {symbols.length} available
                  </span>
                </div>
              </div>
            )}

            {/* List / Results Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-800/50">
              {/* Special State: CFD Not Available */}
              {cfdNotAvailable ? (
                <div className="py-10 px-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-mono text-slate-200">
                      Not Available on Bitget Public API
                    </h3>
                    <p className="text-xs font-mono text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                      Bitget does not provide a public CFD market feed on its official API endpoints.
                      In adherence to DeltaRadar&apos;s zero-mock honesty constraints, no simulated or
                      synthetic data is generated.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setSelectedClass('crypto')}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
                    >
                      Browse Available Crypto Pairs
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div className="py-12 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading official Bitget {selectedClass} catalog...</span>
                </div>
              ) : error ? (
                <div className="py-8 text-center text-xs font-mono text-rose-400">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
                  <p>{error}</p>
                </div>
              ) : filteredSymbols.length === 0 ? (
                <div className="py-10 text-center font-mono space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>&quot;{searchQuery.trim().toUpperCase()}&quot; is Not available on Bitget</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Bitget does not list this instrument in its official public catalog.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    DeltaRadar only connects to verified Bitget market streams — no mock or invented symbols are supported.
                  </p>
                </div>
              ) : (
                filteredSymbols.map((item) => {
                  const isInWatchlist = watchlist.some(
                    (w) => w.symbol.replace(/[/-]/g, '').toUpperCase() === item.symbol
                  );

                  return (
                    <div
                      key={item.symbol}
                      className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-950/60 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AssetBadge
                          symbol={item.symbol}
                          name={item.name}
                          assetClass={item.assetClass}
                          size="md"
                          showLogo={true}
                          showSource={true}
                          showClassTag={true}
                          showName={true}
                        />
                        {item.marketType === 'futures' && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            PERP
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isInWatchlist ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">In Watchlist</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onAddAsset({
                                symbol: item.symbol,
                                name: item.name,
                                assetClass: item.assetClass,
                                tag: item.assetClass === 'stock' ? 'Tokenized Stock' : item.marketType === 'futures' ? 'Perpetual' : 'Bitget Spot',
                                marketType: item.marketType,
                              });
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: REORDER & REMOVE VIEW */}
        {activeTab === 'manage' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-800/60">
            <div className="mb-3 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{watchlist.length} Assets in Watchlist (Persisted)</span>
              <span>Use arrows to reorder priority</span>
            </div>

            {watchlist.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-slate-500">
                <p>Your watchlist is empty.</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold"
                >
                  Add Your First Asset
                </button>
              </div>
            ) : (
              watchlist.map((item, index) => (
                <div
                  key={item.symbol}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-950/40 rounded-lg px-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-4 text-center font-bold">
                      {index + 1}
                    </span>
                    <AssetBadge
                      symbol={item.symbol}
                      name={item.name}
                      assetClass={item.assetClass}
                      size="md"
                      showLogo={true}
                      showSource={true}
                      showClassTag={true}
                      showName={true}
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Select for Chart */}
                    {onSelectAsset && (
                      <button
                        onClick={() => {
                          onSelectAsset(item.symbol);
                          onClose();
                        }}
                        className="px-2 py-1 text-xs font-mono text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors hidden sm:block"
                        title="Open on Unified Screen"
                      >
                        Open
                      </button>
                    )}

                    {/* Move Up */}
                    <button
                      onClick={() => onMoveAsset(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => onMoveAsset(index, 'down')}
                      disabled={index === watchlist.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => onRemoveAsset(item.symbol)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 hidden sm:inline">
            Persisted locally in your browser storage
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
