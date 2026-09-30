import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { AngelQuoteResponse, AngelCandleResponse, QuoteData, Candle } from '../models/types';

@Injectable({ providedIn: 'root' })
export class AngelService {
  private readonly http = inject(HttpClient);

  getQuotes(symbols: string[]): Observable<QuoteData[]> {
    return this.http
      .get<AngelQuoteResponse>(`/api/angel/quote?symbols=${symbols.join(',')}`)
      .pipe(map(r => r.data?.fetched ?? []));
  }

  getCandles(symbol: string, interval: string, from: string, to: string): Observable<Candle[]> {
    const params = new URLSearchParams({ symbol, interval, from, to });
    return this.http
      .get<AngelCandleResponse>(`/api/angel/candles?${params}`)
      .pipe(
        map(r =>
          (r.data ?? []).map(([time, open, high, low, close, volume]) => ({
            time, open, high, low, close, volume,
          })),
        ),
      );
  }
}
