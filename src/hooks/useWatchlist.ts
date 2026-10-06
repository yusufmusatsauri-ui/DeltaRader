import { useState, useEffect, useCallback } from 'react';
import { AssetClassCategory, deduceAssetClass } from '../components/AssetBadge';

export interface WatchlistItem {
  symbol: string;
  name: string;
  assetClass: AssetClassCategory;
  tag?: string;
  marketType?: 'spot' | 'futures';
  addedAt?: number;
}

const STORAGE_KEY = 'deltaradar_watchlist_v3';

export const MANDATED_TOKENIZED_STOCKS: WatchlistItem[] = [
  { symbol: 'RNVDAUSDT', name: 'NVIDIA Corp', assetClass: 'stock', tag: 'Tokenized Stock' },
  { symbol: 'RMUUSDT', name: 'Micron Technology', assetClass: 'stock', tag: 'Tokenized Stock' },
  { symbol: 'RSNDKUSDT', name: 'SanDisk Corp', assetClass: 'stock', tag: 'Tokenized Stock' },
  { symbol: 'RMETAUSDT', name: 'Meta Platforms', assetClass: 'stock', tag: 'Tokenized Stock' },
  { symbol: 'RMSFTUSDT', name: 'Microsoft Corp', assetClass: 'stock', tag: 'Tokenized Stock' },
  { symbol: 'RAAPLUSDT', name: 'Apple Inc', assetClass: 'stock', tag: 'Tokenized Stock' },
  { symbol: 'RSPCXUSDT', name: 'SpaceX', assetClass: 'stock', tag: 'Tokenized Stock' },
];

export const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'SOLUSDT', name: 'Solana', assetClass: 'crypto', tag: 'Top L1' },
  { symbol: 'BTCUSDT', name: 'Bitcoin', assetClass: 'crypto', tag: 'Benchmark' },
  { symbol: 'ETHUSDT', name: 'Ethereum', assetClass: 'crypto', tag: 'Smart Contracts' },
  ...MANDATED_TOKENIZED_STOCKS,
  { symbol: 'RTSLAUSDT', name: 'Tesla Inc', assetClass: 'stock', tag: 'Tokenized Stock' },
  { symbol: 'SUIUSDT', name: 'Sui Network', assetClass: 'crypto', tag: 'High-Throughput' },
  { symbol: 'PAXGUSDT', name: 'PAX Gold', assetClass: 'gold_forex', tag: 'Physical Gold Spot' },
  { symbol: 'XAUUSDT', name: 'Gold Perpetual', assetClass: 'gold_forex', tag: 'Gold Contract', marketType: 'futures' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', assetClass: 'crypto', tag: 'Subnets' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', assetClass: 'crypto', tag: 'Meme Bellwether' },
];

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('deltaradar_watchlist_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list: WatchlistItem[] = parsed.map((item) => ({
            ...item,
            assetClass: item.assetClass || deduceAssetClass(item.symbol),
          }));

          // Ensure all mandated tokenized stocks are present in the list
          const existingSyms = new Set(list.map((i) => i.symbol.replace(/[/-]/g, '').toUpperCase()));
          for (const stock of MANDATED_TOKENIZED_STOCKS) {
            const clean = stock.symbol.replace(/[/-]/g, '').toUpperCase();
            if (!existingSyms.has(clean)) {
              list.push(stock);
              existingSyms.add(clean);
            }
          }
          return list;
        }
      }
    } catch (err) {
      console.warn('[useWatchlist] Error loading watchlist from localStorage:', err);
    }
    return DEFAULT_WATCHLIST;
  });

  // Sync to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch (err) {
      console.warn('[useWatchlist] Error saving watchlist to localStorage:', err);
    }
  }, [watchlist]);

  // Add an asset (prevents duplicates)
  const addAsset = useCallback((item: WatchlistItem): boolean => {
    const cleanSym = item.symbol.replace(/[/-]/g, '').toUpperCase();
    let alreadyExists = false;

    setWatchlist((prev) => {
      if (prev.some((p) => p.symbol.replace(/[/-]/g, '').toUpperCase() === cleanSym)) {
        alreadyExists = true;
        return prev;
      }
      return [
        ...prev,
        {
          ...item,
          symbol: cleanSym,
          addedAt: Date.now(),
        },
      ];
    });

    return !alreadyExists;
  }, []);

  // Remove an asset
  const removeAsset = useCallback((symbol: string) => {
    const cleanSym = symbol.replace(/[/-]/g, '').toUpperCase();
    setWatchlist((prev) => prev.filter((item) => item.symbol.replace(/[/-]/g, '').toUpperCase() !== cleanSym));
  }, []);

  // Move asset up or down in order
  const moveAsset = useCallback((index: number, direction: 'up' | 'down') => {
    setWatchlist((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }, []);

  // Reorder entire list
  const reorderAssets = useCallback((newOrder: WatchlistItem[]) => {
    setWatchlist(newOrder);
  }, []);

  // Reset to default list
  const resetToDefaults = useCallback(() => {
    setWatchlist(DEFAULT_WATCHLIST);
  }, []);

  const isSymbolInWatchlist = useCallback(
    (symbol: string): boolean => {
      const clean = symbol.replace(/[/-]/g, '').toUpperCase();
      return watchlist.some((item) => item.symbol.replace(/[/-]/g, '').toUpperCase() === clean);
    },
    [watchlist]
  );

  return {
    watchlist,
    addAsset,
    removeAsset,
    moveAsset,
    reorderAssets,
    resetToDefaults,
    isSymbolInWatchlist,
  };
}
