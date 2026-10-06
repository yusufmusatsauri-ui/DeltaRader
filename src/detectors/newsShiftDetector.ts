export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  timestamp: number;
  source: string;
}

export interface NewsShiftResult {
  hasNewsShift: boolean;
  matchingHeadlines: NewsArticle[];
  latestHeadline?: NewsArticle;
  causeLabel: string;
  sentimentStatus: string;
  asset: string;
  summary: string;
}

// Asset keyword mapping for precise headline relevance
export const ASSET_KEYWORDS: Record<string, string[]> = {
  SOLUSDT: ['solana', 'sol '],
  BTCUSDT: ['bitcoin', 'btc'],
  ETHUSDT: ['ethereum', 'eth ', 'ether '],
  SUIUSDT: ['sui ', 'sui network'],
  AVAXUSDT: ['avalanche', 'avax'],
  DOGEUSDT: ['dogecoin', 'doge '],
  NEARUSDT: ['near protocol', 'near '],
  LINKUSDT: ['chainlink', 'link token', 'link price'],
  ARBUSDT: ['arbitrum', 'arb token', 'arb '],
};

/**
 * News / Sentiment Shift Detector
 * Checks for fresh relevant news headlines mentioning the watchlist asset.
 * Marks cause as "headline-based, sentiment not yet scored" per user requirement.
 */
export function detectNewsShift(
  symbol: string,
  headlines: NewsArticle[],
  seenHeadlineIds: Set<string>
): NewsShiftResult {
  const keywords = ASSET_KEYWORDS[symbol] || [symbol.replace('USDT', '').toLowerCase()];
  
  // Filter headlines that mention this asset
  const relevant = headlines.filter((item) => {
    const text = item.title.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });

  // Find newly surfaced headlines that haven't triggered an alert yet
  const freshUnseen = relevant.filter((item) => !seenHeadlineIds.has(item.id));

  if (freshUnseen.length === 0) {
    return {
      hasNewsShift: false,
      matchingHeadlines: relevant,
      causeLabel: 'headline-based, sentiment not yet scored',
      sentimentStatus: 'unscored',
      asset: symbol,
      summary: relevant.length > 0 
        ? `${relevant.length} headlines on record (no new unseen events)`
        : 'No recent headlines mentioning asset',
    };
  }

  const latest = freshUnseen[0];

  return {
    hasNewsShift: true,
    matchingHeadlines: freshUnseen,
    latestHeadline: latest,
    causeLabel: 'headline-based, sentiment not yet scored',
    sentimentStatus: 'unscored',
    asset: symbol,
    summary: `New Headline: "${latest.title}" (${latest.source})`,
  };
}
