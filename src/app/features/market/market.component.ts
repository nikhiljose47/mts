import { Component, OnInit, OnDestroy, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { Subscription, interval, switchMap, startWith, catchError, of } from 'rxjs';
import { AiSidebarComponent } from '../../shared/components/ai-sidebar/ai-sidebar.component';
import { ChartComponent } from './chart/chart.component';
import { AngelService } from '../../services/angel.service';
import { PageContextService } from '../../services/page-context.service';
import type { QuoteData, Candle } from '../../models/types';

const DEFAULT_SYMBOLS = ['RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK'];
const POLL_INTERVAL_MS = 5000;

interface IntervalOption {
  label: string;
  value: string;
  /** Calendar days to look back; 0 = today only */
  days: number;
}

const INTERVALS: IntervalOption[] = [
  { label: '1m',  value: 'ONE_MINUTE',     days: 0   },
  { label: '5m',  value: 'FIVE_MINUTE',    days: 3   },
  { label: '15m', value: 'FIFTEEN_MINUTE', days: 7   },
  { label: '1h',  value: 'ONE_HOUR',       days: 30  },
  { label: '1D',  value: 'ONE_DAY',        days: 365 },
];

/** Format a Date as "YYYY-MM-DD HH:mm" in IST (what AngelOne expects). */
function toIST(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replace('T', ' ');
}

function getDateRange(days: number): { from: string; to: string } {
  const now = new Date();
  const to = toIST(now);
  if (days === 0) {
    /* Today from market open 09:15 IST */
    const from = new Date();
    from.setHours(3, 45, 0, 0); // 09:15 IST = 03:45 UTC
    return { from: toIST(from), to };
  }
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: toIST(from), to };
}

@Component({
  selector: 'app-market',
  imports: [AiSidebarComponent, ChartComponent, DecimalPipe],
  templateUrl: './market.component.html',
  styleUrl: './market.component.css',
})
export class MarketComponent implements OnInit, OnDestroy {
  private readonly angel = inject(AngelService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly pageCtx = inject(PageContextService);

  readonly intervals = INTERVALS;

  /* Watchlist state */
  readonly quotes = signal<QuoteData[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /* Chart state */
  readonly selectedSymbol = signal(DEFAULT_SYMBOLS[0]);
  readonly selectedInterval = signal<IntervalOption>(INTERVALS[1]);
  readonly candles = signal<Candle[]>([]);
  readonly chartLoading = signal(false);
  readonly chartError = signal<string | null>(null);

  private quoteSub?: Subscription;
  private candleSub?: Subscription;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.startQuotePolling();
    this.fetchCandles();
  }

  ngOnDestroy(): void {
    this.quoteSub?.unsubscribe();
    this.candleSub?.unsubscribe();
  }

  private startQuotePolling(): void {
    this.quoteSub = interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.angel.getQuotes(DEFAULT_SYMBOLS).pipe(
            catchError(err => {
              this.error.set(err.message ?? 'Failed to fetch quotes');
              return of([]);
            }),
          ),
        ),
      )
      .subscribe(data => {
        if (data.length) {
          this.quotes.set(data);
          this.error.set(null);
          /* Keep AI context up-to-date with the selected symbol's LTP */
          const selected = data.find(q => q.tradingSymbol === this.selectedSymbol());
          if (selected) this.pageCtx.setStock(selected.tradingSymbol, selected.ltp);
        }
        this.loading.set(false);
      });
  }

  private fetchCandles(): void {
    this.candleSub?.unsubscribe();
    this.chartLoading.set(true);
    this.chartError.set(null);

    const { value, days } = this.selectedInterval();
    const { from, to } = getDateRange(days);

    this.candleSub = this.angel
      .getCandles(this.selectedSymbol(), value, from, to)
      .subscribe({
        next: data => {
          this.candles.set(data);
          this.chartLoading.set(false);
        },
        error: err => {
          this.chartError.set(err.message ?? 'Failed to fetch candles');
          this.chartLoading.set(false);
        },
      });
  }

  selectSymbol(symbol: string): void {
    this.selectedSymbol.set(symbol);
    this.fetchCandles();
    /* Update AI context immediately on symbol switch */
    const q = this.quotes().find(q => q.tradingSymbol === symbol);
    if (q) this.pageCtx.setStock(q.tradingSymbol, q.ltp);
  }

  selectInterval(opt: IntervalOption): void {
    this.selectedInterval.set(opt);
    this.fetchCandles();
  }

  changeClass(val: number): string {
    return val >= 0 ? 'text-green-400' : 'text-red-400';
  }
}
