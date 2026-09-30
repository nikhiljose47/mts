import { Injectable } from '@angular/core';
import type { ChatMessage } from '../models/types';

const KEY = 'mts-chat-messages';

@Injectable({ providedIn: 'root' })
export class SessionStoreService {
  save(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(messages));
    } catch { /* storage full or unavailable */ }
  }

  load(): ChatMessage[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch { /* ignore */ }
  }
}
