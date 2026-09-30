/**
 * AngelOne NSE symboltoken map for common large-cap stocks.
 * Token values are from AngelOne's instrument master.
 * Add more symbols here or use the search API for unlisted ones.
 */
export const NSE_TOKENS: Record<string, string> = {
  RELIANCE: '2885',
  TCS: '11536',
  INFY: '1594',
  HDFCBANK: '1333',
  ICICIBANK: '4963',
  WIPRO: '3787',
  SBIN: '3045',
  BHARTIARTL: '10604',
  AXISBANK: '5900',
  KOTAKBANK: '1922',
  LT: '11483',
  MARUTI: '10999',
  SUNPHARMA: '3351',
  TATAMOTORS: '3456',
  HCLTECH: '7229',
  HINDUNILVR: '1394',
  BAJFINANCE: '317',
};

export const DEFAULT_WATCHLIST = ['RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK'];
