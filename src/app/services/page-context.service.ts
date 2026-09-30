import { Injectable, signal } from '@angular/core';
import type { PageContext } from '../models/types';

@Injectable({ providedIn: 'root' })
export class PageContextService {
  readonly context = signal<PageContext>({});
  /** Non-null when some UI element wants the sidebar to auto-send a prompt. */
  readonly pendingPrompt = signal<string | null>(null);

  setStock(symbol: string, ltp: number): void {
    this.context.update(c => ({ ...c, symbol, ltp, url: undefined, title: undefined }));
  }

  setPage(url: string, title: string): void {
    this.context.update(c => ({ ...c, url, title, symbol: undefined, ltp: undefined }));
  }

  setSelectedText(text: string): void {
    this.context.update(c => ({ ...c, selectedText: text || undefined }));
  }

  setExtractedContent(text: string): void {
    this.context.update(c => ({ ...c, extractedContent: text || undefined }));
  }

  /** Set selected text and trigger an auto-send in the AI sidebar. */
  askAboutSelection(text: string, prompt: string): void {
    this.context.update(c => ({ ...c, selectedText: text || undefined }));
    this.pendingPrompt.set(prompt);
  }

  clearPendingPrompt(): void {
    this.pendingPrompt.set(null);
  }

  clear(): void {
    this.context.set({});
  }
}
