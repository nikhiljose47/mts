import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';

export interface ExtractResult {
  title: string;
  byline: string | null;
  content: string;
  excerpt: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class ExtractService {
  private readonly http = inject(HttpClient);

  extract(url: string): Observable<ExtractResult> {
    return this.http.post<ExtractResult>('/api/extract', { url });
  }
}
