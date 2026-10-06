import React, { useState } from 'react';

export type AssetClassCategory = 'crypto' | 'stock' | 'cfd' | 'gold_forex';

export interface AssetInfo {
  symbol: string;
  name?: string;
  assetClass?: AssetClassCategory | string;
  baseCoin?: string;
  logoUrl?: string;
}

interface AssetBadgeProps {
  symbol: string;
  name?: string;
  assetClass?: AssetClassCategory | string;
  size?: 'sm' | 'md' | 'lg';
  showLogo?: boolean;
  showSource?: boolean;
  showClassTag?: boolean;
  showName?: boolean;
  className?: string;
}

// Helper to deduce asset class if not provided
export function deduceAssetClass(symbol: string, provided?: string): AssetClassCategory {
  if (provided) {
    const p = provided.toLowerCase();
    if (p.includes('stock') || p.includes('tokenized')) return 'stock';
    if (p.includes('cfd')) return 'cfd';
    if (p.includes('gold') || p.includes('forex') || p.includes('xau')) return 'gold_forex';
    return 'crypto';
  }

  const s = symbol.toUpperCase().replace(/[/-]/g, '');
  if (s.startsWith('R') && s.length > 5 && s.endsWith('USDT') && !['RENDERUSDT', 'RONINUSDT', 'RAYUSDT', 'RSRUSDT', 'RUNEUSDT'].includes(s)) {
    return 'stock';
  }
  if (['TSLA', 'AAPL', 'NVDA', 'DIS', 'COIN', 'MSFT', 'AMZN', 'GOOGL', 'META', 'MU', 'SNDK', 'SPCX'].some((k) => s.includes(k))) {
    return 'stock';
  }
  if (['XAU', 'XAUT', 'PAXG', 'GOLD', 'EUR', 'GBP', 'JPY'].some((k) => s.includes(k))) {
    return 'gold_forex';
  }
  return 'crypto';
}

export const KNOWN_STOCK_NAMES: Record<string, string> = {
  RNVDAUSDT: 'NVIDIA Corp',
  RMUUSDT: 'Micron Technology',
  RSNDKUSDT: 'SanDisk Corp',
  RMETAUSDT: 'Meta Platforms',
  RMSFTUSDT: 'Microsoft Corp',
  RAAPLUSDT: 'Apple Inc',
  RSPCXUSDT: 'SpaceX',
  RTSLAUSDT: 'Tesla Inc',
  RAMZNUSDT: 'Amazon.com',
  RGOOGLUSDT: 'Alphabet Inc',
  RCOINUSDT: 'Coinbase Global',
  RDISUSDT: 'Walt Disney Co',
};

// Helper to get base symbol for display (e.g., SOLUSDT -> SOL, RTSLAUSDT -> rTSLA)
export function getDisplayTicker(symbol: string): string {
  const clean = symbol.replace(/[/-]/g, '').toUpperCase();
  if (clean.endsWith('USDT')) {
    const base = clean.slice(0, -4);
    if (base.startsWith('R') && base.length > 2 && !['RAY', 'RSR', 'RUNE'].includes(base)) {
      return `${base}/USDT`;
    }
    return `${base}/USDT`;
  }
  if (clean.endsWith('USD')) {
    return `${clean.slice(0, -3)}/USD`;
  }
  if (clean.endsWith('EUR')) {
    return `${clean.slice(0, -3)}/EUR`;
  }
  return symbol;
}

// Known coin logos for crypto & gold tokens
const KNOWN_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  SUI: 'https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  NEAR: 'https://assets.coingecko.com/coins/images/10365/small/near.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/arbitrum_logo.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  PAXG: 'https://assets.coingecko.com/coins/images/9519/small/paxg.PNG',
  XAUT: 'https://assets.coingecko.com/coins/images/10481/small/Tether_Gold.png',
  XAU: 'https://assets.coingecko.com/coins/images/9519/small/paxg.PNG',
};

export const AssetBadge: React.FC<AssetBadgeProps> = ({
  symbol,
  name,
  assetClass: rawClass,
  size = 'md',
  showLogo = true,
  showSource = true,
  showClassTag = true,
  showName = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const deducedClass = deduceAssetClass(symbol, rawClass);

  // Derive base coin for logo lookup & letter badge
  const cleanSymbol = symbol.replace(/[/-]/g, '').toUpperCase();
  let baseCoin = cleanSymbol;
  if (cleanSymbol.endsWith('USDT')) baseCoin = cleanSymbol.slice(0, -4);
  else if (cleanSymbol.endsWith('USD')) baseCoin = cleanSymbol.slice(0, -3);
  else if (cleanSymbol.endsWith('EUR')) baseCoin = cleanSymbol.slice(0, -3);

  const logoKey = baseCoin.startsWith('R') && baseCoin.length > 2 ? baseCoin.slice(1) : baseCoin;
  const logoUrl = KNOWN_LOGOS[logoKey] || KNOWN_LOGOS[baseCoin];

  // Letter badge initials (1-2 characters)
  const initials = (baseCoin.startsWith('R') && baseCoin.length > 2 ? baseCoin.slice(1, 3) : baseCoin.slice(0, 2)).toUpperCase();

  // Class tag styling & text
  const classConfig = {
    crypto: {
      label: 'CRYPTO',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      avatarBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
    },
    stock: {
      label: 'STOCK',
      badgeClass: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      avatarBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50',
    },
    cfd: {
      label: 'CFD',
      badgeClass: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
      avatarBg: 'bg-orange-950/80 text-orange-300 border-orange-700/50',
    },
    gold_forex: {
      label: symbol.toUpperCase().includes('EUR') || symbol.toUpperCase().includes('GBP') ? 'FOREX' : 'GOLD',
      badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      avatarBg: 'bg-amber-950/80 text-amber-300 border-amber-700/50',
    },
  }[deducedClass];

  const sizeClasses = {
    sm: {
      avatar: 'w-4 h-4 text-[9px]',
      ticker: 'text-xs',
      tag: 'text-[9px] px-1 py-0.2',
      source: 'text-[9px] px-1 py-0.2',
      gap: 'gap-1.5',
    },
    md: {
      avatar: 'w-6 h-6 text-xs',
      ticker: 'text-sm',
      tag: 'text-[10px] px-1.5 py-0.5',
      source: 'text-[10px] px-1.5 py-0.5',
      gap: 'gap-2',
    },
    lg: {
      avatar: 'w-8 h-8 text-sm',
      ticker: 'text-base font-bold',
      tag: 'text-xs px-2 py-0.5',
      source: 'text-xs px-2 py-0.5',
      gap: 'gap-2.5',
    },
  }[size];

  const displayTicker = getDisplayTicker(symbol);

  return (
    <div className={`inline-flex items-center ${sizeClasses.gap} ${className}`}>
      {/* 1. Token Logo or Letter Badge */}
      {showLogo && (
        <div className="shrink-0 flex items-center justify-center">
          {logoUrl && !imgError ? (
            <img
              src={logoUrl}
              alt={baseCoin}
              onError={() => setImgError(true)}
              className={`${sizeClasses.avatar} rounded-full object-contain bg-slate-900 ring-1 ring-slate-800`}
            />
          ) : (
            <div
              className={`${sizeClasses.avatar} rounded-full font-mono font-bold flex items-center justify-center border shadow-inner ${classConfig.avatarBg}`}
              title={baseCoin}
            >
              {initials}
            </div>
          )}
        </div>
      )}

      {/* 2. Ticker Symbol (+ optional friendly name) */}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={`font-mono font-bold text-slate-100 tracking-tight ${sizeClasses.ticker}`}>
          {displayTicker}
        </span>
        {showName && (name || KNOWN_STOCK_NAMES[cleanSymbol]) && (
          <span className="text-xs text-slate-400 font-mono hidden sm:inline truncate max-w-[130px]">
            {name || KNOWN_STOCK_NAMES[cleanSymbol]}
          </span>
        )}
      </div>

      {/* 3. Colored Asset-Class Tag (CRYPTO / STOCK / CFD / GOLD) */}
      {showClassTag && (
        <span
          className={`font-mono font-bold uppercase rounded tracking-wider shrink-0 ${sizeClasses.tag} ${classConfig.badgeClass}`}
        >
          {classConfig.label}
        </span>
      )}

      {/* 4. Source Tag: "Bitget" */}
      {showSource && (
        <span
          className={`font-mono font-medium rounded shrink-0 bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses.source}`}
          title="Direct Bitget Public Feed"
        >
          Bitget
        </span>
      )}
    </div>
  );
};
