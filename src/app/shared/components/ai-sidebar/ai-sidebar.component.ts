import {
  Component, inject, signal, computed, effect,
  PLATFORM_ID, ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AiService } from '../../../services/ai.service';
import { PageContextService } from '../../../services/page-context.service';
import { SessionStoreService } from '../../../services/session-store.service';
import type { ChatMessage } from '../../../models/types';

let msgId = 0;
function nextId(): string { return `m${++msgId}`; }

@Component({
  selector: 'app-ai-sidebar',
  imports: [],
  templateUrl: './ai-sidebar.component.html',
  styleUrl: './ai-sidebar.component.css',
})
export class AiSidebarComponent implements AfterViewChecked {
  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;

  private readonly ai = inject(AiService);
  private readonly ctxSvc = inject(PageContextService);
  private readonly store = inject(SessionStoreService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly messages = signal<ChatMessage[]>(
    isPlatformBrowser(this.platformId) ? this.store.load() : [],
  );
  readonly inputText = signal('');
  readonly streaming = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly hasMessages = computed(() => this.messages().length > 0);

  /** Label shown next to the model name to indicate what context is active. */
  readonly contextLabel = computed(() => {
    const ctx = this.ctxSvc.context();
    if (ctx.symbol) return ctx.symbol;
    if (ctx.title && ctx.title !== ctx.url) return ctx.title.slice(0, 24);
    return null;
  });

  /** Prompt text for the Summarize shortcut, adapted to current context. */
  readonly summarizePrompt = computed(() => {
    const ctx = this.ctxSvc.context();
    if (ctx.symbol) return `Summarize the latest news and outlook for ${ctx.symbol}`;
    if (ctx.extractedContent) return 'Summarize this article in 3-4 sentences';
    return 'Summarize the current context';
  });

  /** Prompt for Key points shortcut. */
  readonly keyPointsPrompt = computed(() => {
    const ctx = this.ctxSvc.context();
    if (ctx.symbol) return `What are the key fundamental and technical factors for ${ctx.symbol}?`;
    if (ctx.extractedContent) return 'List the key points from this article';
    return 'What are the key points I should know?';
  });

  private needsScroll = false;

  constructor() {
    /* Auto-send when another component triggers a prompt (e.g. text selection menu). */
    effect(() => {
      const prompt = this.ctxSvc.pendingPrompt();
      if (prompt) {
        this.ctxSvc.clearPendingPrompt();
        this.send(prompt);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.needsScroll) {
      this.scrollToBottom();
      this.needsScroll = false;
    }
  }

  private scrollToBottom(): void {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async send(text?: string): Promise<void> {
    const content = (text ?? this.inputText()).trim();
    if (!content || this.streaming()) return;
    this.inputText.set('');
    this.errorMsg.set(null);

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content, timestamp: Date.now() };
    this.messages.update(m => [...m, userMsg]);
    this.needsScroll = true;

    const assistantMsg: ChatMessage = {
      id: nextId(), role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true,
    };
    this.messages.update(m => [...m, assistantMsg]);
    const aid = assistantMsg.id;
    this.streaming.set(true);

    const history = this.messages()
      .filter(m => !m.isStreaming && m.id !== aid)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      await this.ai.stream(
        history,
        this.ctxSvc.context(),
        delta => {
          this.messages.update(msgs =>
            msgs.map(m => m.id === aid ? { ...m, content: m.content + delta } : m),
          );
          this.needsScroll = true;
        },
        () => {
          this.messages.update(msgs =>
            msgs.map(m => m.id === aid ? { ...m, isStreaming: false } : m),
          );
          this.streaming.set(false);
          this.store.save(this.messages());
          this.needsScroll = true;
        },
        err => {
          this.errorMsg.set(err);
          this.messages.update(msgs => msgs.filter(m => m.id !== aid));
          this.streaming.set(false);
        },
      );
    } catch (e) {
      this.errorMsg.set((e as Error).message ?? 'Request failed');
      this.messages.update(msgs => msgs.filter(m => m.id !== aid));
      this.streaming.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  clearChat(): void {
    this.messages.set([]);
    this.store.clear();
    this.errorMsg.set(null);
  }
}
