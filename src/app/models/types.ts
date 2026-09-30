/* ── AngelOne market data ──────────────────────────────────────── */

export interface QuoteData {
  exchange: string;
  tradingSymbol: string;
  symbolToken: string;
  open: number;
  high: number;
  low: number;
  /** Previous day's close */
  close: number;
  ltp: number;
  volume: number;
  percentchange: number;
}

export interface AngelQuoteResponse {
  status: boolean;
  message: string;
  data: {
    fetched: QuoteData[];
    unfetched: string[];
  };
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AngelCandleResponse {
  status: boolean;
  message: string;
  data: [string, number, number, number, number, number][];
}

/* ── Chat / AI ──────────────────────────────────────────────────── */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface PageContext {
  url?: string;
  title?: string;
  selectedText?: string;
  extractedContent?: string;
  /** Stock symbol currently in focus on the market page */
  symbol?: string;
  ltp?: number;
}
