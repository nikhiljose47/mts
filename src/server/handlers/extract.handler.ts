import type { Request, Response } from 'express';
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024; /* 2 MB */

/* Basic SSRF guard */
function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname;
    if (/^(localhost|127\.|0\.0\.0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fd)/i.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function extractHandler(req: Request, res: Response): Promise<void> {
  const url = (req.body as { url?: unknown }).url;
  if (typeof url !== 'string' || !url) {
    res.status(400).json({ error: 'url is required' }); return;
  }
  if (!isSafeUrl(url)) {
    res.status(400).json({ error: 'Invalid or disallowed URL' }); return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MTS-Reader/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);

    if (!response.ok) { res.status(502).json({ error: `Upstream returned ${response.status}` }); return; }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) { res.status(422).json({ error: 'URL does not return HTML' }); return; }

    /* Read up to MAX_BYTES */
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
      if (total > MAX_BYTES) { reader.cancel(); break; }
    }
    const html = Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf-8');

    /* linkedom parses to a DOM Readability can use */
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as Document).parse();

    if (!article) { res.status(422).json({ error: 'Could not extract readable content' }); return; }

    res.json({
      title: article.title ?? '',
      byline: article.byline ?? null,
      content: article.content ?? '',
      excerpt: article.excerpt ?? '',
      url,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message ?? 'Extraction failed' });
  }
}
