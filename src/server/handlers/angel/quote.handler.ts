import type { Request, Response } from 'express';
import { angelPost } from '../../lib/angel-client';
import { NSE_TOKENS, DEFAULT_WATCHLIST } from './symbols';
import type { AngelQuoteResponse } from '../../../app/models/types';

export async function quoteHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawSymbols = req.query['symbols'] as string | undefined;
    const symbols = rawSymbols ? rawSymbols.split(',').map(s => s.trim().toUpperCase()) : DEFAULT_WATCHLIST;

    const tokens = symbols.map(s => NSE_TOKENS[s]).filter(Boolean);
    if (!tokens.length) {
      res.status(400).json({ error: 'No valid symbols. Check the symbol name against NSE_TOKENS.' });
      return;
    }

    const data = await angelPost<AngelQuoteResponse>(
      '/rest/secure/angelbroking/market/v1/quote/',
      { mode: 'FULL', exchangeTokens: { NSE: tokens } },
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
