import { Component, signal, inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { AiSidebarComponent } from '../../shared/components/ai-sidebar/ai-sidebar.component';
import { ExtractService, type ExtractResult } from '../../services/extract.service';
import { PageContextService } from '../../services/page-context.service';

interface SelectionMenu {
  x: number;
  y: number;
  text: string;
}

@Component({
  selector: 'app-browser',
  imports: [ToolbarComponent, AiSidebarComponent],
  templateUrl: './browser.component.html',
  styleUrl: './browser.component.css',
})
export class BrowserComponent {
  private readonly extract = inject(ExtractService);
  private readonly pageCtx = inject(PageContextService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentUrl = signal('');
  readonly iframeUrl = signal<SafeResourceUrl | null>(null);

  /* Reader mode */
  readonly readerMode = signal(false);
  readonly readerLoading = signal(false);
  readonly readerError = signal<string | null>(null);
  readonly readerArticle = signal<ExtractResult | null>(null);

  /* Text selection floating menu */
  readonly selectionMenu = signal<SelectionMenu | null>(null);

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;

    /* Defer so the selection is finalised before we read it */
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (text.length < 5) { this.selectionMenu.set(null); return; }

      /* Position menu above the cursor */
      this.selectionMenu.set({ x: event.clientX, y: event.clientY - 48, text });
    }, 0);
  }

  dismissMenu(): void {
    this.selectionMenu.set(null);
    if (isPlatformBrowser(this.platformId)) window.getSelection()?.removeAllRanges();
    this.pageCtx.setSelectedText('');
  }

  askAI(action: 'explain' | 'summarize' | 'ask', text: string): void {
    const prompts = {
      explain: `Explain this text: "${text.slice(0, 300)}"`,
      summarize: `Summarize this: "${text.slice(0, 300)}"`,
      ask: `What does this mean? "${text.slice(0, 300)}"`,
    };
    this.pageCtx.askAboutSelection(text, prompts[action]);
    this.selectionMenu.set(null);
  }

  navigate(url: string): void {
    this.currentUrl.set(url);
    this.readerMode.set(false);
    this.readerArticle.set(null);
    this.readerError.set(null);
    this.pageCtx.setPage(url, url);

    if (isPlatformBrowser(this.platformId)) {
      this.iframeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    }
  }

  toggleReader(): void {
    if (!this.currentUrl()) return;

    if (this.readerMode()) {
      this.readerMode.set(false);
      return;
    }

    this.readerMode.set(true);
    if (this.readerArticle()) return; /* Already fetched for this URL */

    this.readerLoading.set(true);
    this.readerError.set(null);

    this.extract.extract(this.currentUrl()).pipe(
      catchError(err => {
        this.readerError.set(err.error?.error ?? err.message ?? 'Extraction failed');
        this.readerLoading.set(false);
        return of(null);
      }),
    ).subscribe(result => {
      if (!result) return;
      this.readerArticle.set(result);
      this.readerLoading.set(false);
      this.pageCtx.setPage(result.url, result.title);
      const plainText = (result.excerpt + '\n\n' + result.content)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      this.pageCtx.setExtractedContent(plainText);
    });
  }
}
