import {
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { Candle } from '../../../models/types';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.css',
})
export class ChartComponent implements OnDestroy {
  readonly candles = input<Candle[]>([]);
  readonly symbol = input('');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly chartEl = viewChild<ElementRef<HTMLDivElement>>('chartEl');

  private chart?: IChartApi;
  private series?: ISeriesApi<'Candlestick'>;
  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      await this.initChart();
    });

    /* Re-render whenever the candles signal changes */
    effect(() => {
      const data = this.candles();
      if (this.series && data.length) this.applyData(data);
    });
  }

  private async initChart(): Promise<void> {
    const el = this.chartEl()?.nativeElement;
    if (!el) return;

    /* Dynamic import keeps chart lib out of the SSR bundle */
    const { createChart, CandlestickSeries } = await import('lightweight-charts');

    this.chart = createChart(el, {
      layout: {
        background: { color: '#111827' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      width: el.clientWidth,
      height: el.clientHeight,
    });

    this.series = this.chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    this.resizeObserver.observe(el);

    const current = this.candles();
    if (current.length) this.applyData(current);
  }

  private applyData(candles: Candle[]): void {
    const data = candles
      .map(c => ({
        time: parseAngelTime(c.time) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    this.series?.setData(data);
    this.chart?.timeScale().fitContent();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.remove();
  }
}

/**
 * Converts AngelOne timestamp strings to UTC seconds for lightweight-charts.
 * AngelOne returns IST times in "YYYY-MM-DD HH:mm" or ISO format.
 */
function parseAngelTime(timeStr: string): number {
  const iso = timeStr.includes('T') ? timeStr : timeStr.replace(' ', 'T') + ':00+05:30';
  return Math.floor(new Date(iso).getTime() / 1000);
}
