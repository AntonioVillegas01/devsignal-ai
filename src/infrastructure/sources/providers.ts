import Parser from 'rss-parser';
import { z } from 'zod';
import type {
  SourceProviderPort,
  TelemetryPort,
  ClockPort,
} from '../../application/ports';
import type { Source } from '../../domain/entities/models';
import { sourceSchema } from '../../domain/entities/models';
import type { SourceDefinition } from '../../config/sources';
import { SafeFetcher, extractText } from './safe-fetch';
import { canonicalUrl } from '../../domain/value-objects/url';
const releaseSchema = z.object({
  name: z.string().nullable(),
  tag_name: z.string(),
  body: z.string().nullable(),
  html_url: z.url(),
  published_at: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
});
export class GitHubReleasesProvider implements SourceProviderPort {
  constructor(
    private definition: SourceDefinition,
    private http: SafeFetcher,
  ) {}
  async collect(): Promise<Source[]> {
    const { text } = await this.http.text(this.definition.url, [
      'application/json',
    ]);
    const releases = z.array(releaseSchema).max(100).parse(JSON.parse(text));
    const repo = new URL(this.definition.url).pathname
      .replace(/^\/repos\//, '')
      .replace(/\/releases$/, '');
    return releases
      .filter(
        (r) =>
          !r.draft &&
          !r.prerelease &&
          r.published_at &&
          r.html_url.startsWith(`https://github.com/${repo}/releases/`),
      )
      .flatMap((r) => {
        const parsed = sourceSchema.safeParse({
          id: r.html_url,
          title: `${this.definition.name}: ${r.name || r.tag_name}`,
          url: r.html_url,
          publishedAt: r.published_at,
          content: extractText(r.body ?? ''),
          category: this.definition.category,
          kind: 'update',
        });
        return parsed.success ? [parsed.data] : [];
      });
  }
}
export class RssProvider implements SourceProviderPort {
  constructor(
    private definition: SourceDefinition,
    private http: SafeFetcher,
  ) {}
  async collect(): Promise<Source[]> {
    const { text } = await this.http.text(this.definition.url, [
      'application/rss+xml',
      'application/atom+xml',
      'application/xml',
      'text/xml',
    ]);
    if (/<!DOCTYPE|<!ENTITY/i.test(text))
      throw new Error('XML entity declarations are forbidden');
    const feed = await new Parser().parseString(text);
    const items: Source[] = [];
    for (const item of feed.items.slice(0, 12)) {
      if (!item.link || !item.isoDate || !item.title) continue;
      try {
        // Feed links stay on the configured publisher, even if another domain is trusted elsewhere.
        if (
          new URL(item.link).hostname !== new URL(this.definition.url).hostname
        )
          continue;
        const page = await this.http.text(item.link, ['text/html']);
        const parsed = sourceSchema.safeParse({
          id: page.url,
          title: item.title,
          url: page.url,
          publishedAt: new Date(item.isoDate).toISOString(),
          content: extractText(page.text),
          category: this.definition.category,
          kind: 'update',
        });
        if (parsed.success) items.push(parsed.data);
      } catch {
        /* A broken entry does not discard the entire feed. */
      }
    }
    return items;
  }
}
export class TrustedSourcesProvider implements SourceProviderPort {
  constructor(
    private definitions: SourceDefinition[],
    private http: SafeFetcher,
    private clock: ClockPort,
    private telemetry: TelemetryPort,
  ) {}
  async collect(): Promise<Source[]> {
    const results: Source[] = [];
    // Sequential bounded fetches keep source traffic predictable and modest.
    for (const definition of this.definitions) {
      try {
        if (definition.type === 'github')
          results.push(
            ...(await new GitHubReleasesProvider(
              definition,
              this.http,
            ).collect()),
          );
        else if (definition.type === 'rss')
          results.push(
            ...(await new RssProvider(definition, this.http).collect()),
          );
        else {
          const page = await this.http.text(definition.url, ['text/html']);
          results.push(
            sourceSchema.parse({
              id: definition.url,
              title: definition.name,
              url: canonicalUrl(page.url),
              publishedAt: this.clock.now().toISOString(),
              content: extractText(page.text),
              category: definition.category,
              kind: 'reference',
            }),
          );
        }
      } catch {
        this.telemetry.event('source_failed', { source: definition.name });
      }
    }
    return results;
  }
}
