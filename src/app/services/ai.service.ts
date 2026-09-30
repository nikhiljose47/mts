import { Injectable } from '@angular/core';
import type { PageContext } from '../models/types';

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  /**
   * Streams a chat completion via SSE.
   * onDelta fires for each text chunk; onDone fires when the stream ends.
   * Throws if the HTTP request itself fails.
   */
  async stream(
    messages: ChatEntry[],
    pageContext: PageContext,
    onDelta: (delta: string) => void,
    onDone: () => void,
    onError: (msg: string) => void,
  ): Promise<void> {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, pageContext }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(payload) as { delta?: string; error?: string };
          if (parsed.error) { onError(parsed.error); return; }
          if (parsed.delta) onDelta(parsed.delta);
        } catch { /* malformed chunk — skip */ }
      }
    }
    onDone();
  }
}
