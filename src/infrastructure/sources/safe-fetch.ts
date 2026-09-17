import { canonicalUrl } from '../../domain/value-objects/url';
import { PipelineError } from '../../domain/errors/pipeline-error';
export class SafeFetcher {
  constructor(
    private trusted: readonly string[],
    private fetchImpl: typeof fetch = fetch,
    private maxBytes = 1500000,
    private timeoutMs = 12000,
  ) {}
  async text(
    value: string,
    contentTypes: readonly string[],
  ): Promise<{ text: string; url: string }> {
    let url = canonicalUrl(value, this.trusted);
    const signal = AbortSignal.timeout(this.timeoutMs);
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await this.fetchImpl(url, {
        signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'DevSignalAI/1.0',
          Accept: contentTypes.join(', '),
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location)
          throw new PipelineError('source_redirect', 'Missing redirect target');
        url = canonicalUrl(new URL(location, url).toString(), this.trusted);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new PipelineError(
          'source_http',
          `Source returned HTTP ${response.status}`,
        );
      }
      const contentType = response.headers
        .get('content-type')
        ?.split(';')[0]
        ?.trim()
        .toLowerCase();
      if (!contentType || !contentTypes.includes(contentType)) {
        await response.body?.cancel();
        throw new PipelineError(
          'source_content_type',
          'Unexpected source content type',
        );
      }
      if (Number(response.headers.get('content-length')) > this.maxBytes) {
        await response.body?.cancel();
        throw new PipelineError('source_size', 'Source exceeds size limit');
      }
      const reader = response.body?.getReader();
      if (!reader)
        throw new PipelineError('source_empty', 'Missing source body');
      let bytes = 0;
      let text = '';
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          bytes += chunk.byteLength;
          if (bytes > this.maxBytes)
            throw new PipelineError('source_size', 'Source exceeds size limit');
          text += decoder.decode(chunk, { stream: true });
        }
        text += decoder.decode();
        return { text, url };
      } finally {
        await reader.cancel();
      }
    }
    throw new PipelineError('source_redirect', 'Too many redirects');
  }
}
export function extractText(html: string): string {
  const main =
    html.match(
      /<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i,
    )?.[1] ?? html;
  return main
    .replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(
      /&(?:nbsp|amp|lt|gt|quot|#39);/g,
      (entity) =>
        ({
          '&nbsp;': ' ',
          '&amp;': '&',
          '&lt;': '<',
          '&gt;': '>',
          '&quot;': '"',
          '&#39;': "'",
        })[entity] ?? ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 9000);
}
