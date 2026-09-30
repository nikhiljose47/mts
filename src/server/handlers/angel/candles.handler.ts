import type { Request, Response } from 'express';
import { angelPost } from '../../lib/angel-client';
import { NSE_TOKENS } from './symbols';
import type { AngelCandleResponse } from '../../../app/models/types';

/**
 * GET /api/angel/candles
 * Query params: symbol, interval (ONE_MINUTE|FIVE_MINUTE|ONE_DAY etc.), from, to
 * from/to format: "YYYY-MM-DD HH:mm"
 */
export async function candlesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { symbol, interval = 'ONE_MINUTE', from, to } = req.query as Record<string, string>;

    if (!symbol || !from || !to) {
      res.status(400).json({ error: 'Required: symbol, from, to' });
      return;
    }

    const token = NSE_TOKENS[symbol.toUpperCase()];
    if (!token) {
      res.status(400).json({ error: `Unknown symbol: ${symbol}` });
      return;
    }

    const data = await angelPost<AngelCandleResponse>(
      '/rest/secure/angelbroking/historical/v1/getCandleData',
      { exchange: 'NSE', symboltoken: token, interval, fromdate: from, todate: to },
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
