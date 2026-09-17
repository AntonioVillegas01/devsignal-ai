import {
  sourceSchema,
  type Article,
  type Source,
  type Topic,
} from '../entities/models';
import { canonicalUrl } from '../value-objects/url';

const stopWords = new Set(
  'the a an and or for to in of with is on at from this that are as by it be your you can'.split(
    ' ',
  ),
);
export function tokens(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
      (word) => word.length > 1 && !stopWords.has(word),
    ),
  );
}
export function similarity(a: string, b: string): number {
  const x = tokens(a),
    y = tokens(b);
  const union = new Set([...x, ...y]);
  return union.size
    ? [...x].filter((token) => y.has(token)).length / union.size
    : 0;
}
export function findSimilarTopics(
  text: string,
  articles: readonly Article[],
  threshold: number,
): Article[] {
  return articles.filter(
    ({ draft }) =>
      Math.max(
        similarity(text, draft.title),
        similarity(text, `${draft.title} ${draft.summary}`),
      ) >= threshold,
  );
}
export function normalizeSources(
  raw: readonly Source[],
  now: Date,
  lookbackDays: number,
  trusted: readonly string[],
): Source[] {
  const unique = new Map<string, Source>();
  for (const item of raw) {
    try {
      const source = sourceSchema.parse({
        ...item,
        title: item.title.replace(/\s+/g, ' ').trim(),
        url: canonicalUrl(item.url, trusted),
      });
      const age = now.getTime() - Date.parse(source.publishedAt);
      if (
        age < -3600000 ||
        (source.kind === 'update' && age > lookbackDays * 86400000)
      )
        continue;
      if (!unique.has(source.url)) unique.set(source.url, source);
    } catch {
      /* Invalid external items are excluded, never trusted. */
    }
  }
  return [...unique.values()];
}
export function rankTopics(sources: readonly Source[], now: Date): Topic[] {
  return sources
    .filter((s) => s.kind === 'update')
    .map((source) => {
      const related = sources
        .filter((s) => s.url !== source.url && s.category === source.category)
        .sort(
          (a, b) =>
            Number(b.kind === 'reference') - Number(a.kind === 'reference') ||
            similarity(source.title, b.title) -
              similarity(source.title, a.title),
        );
      const ageDays = Math.max(
        0,
        (now.getTime() - Date.parse(source.publishedAt)) / 86400000,
      );
      return {
        title: source.title,
        category: source.category,
        sources: [source, ...related.slice(0, 3)],
        score: Math.round(
          50 / (1 + ageDays / 7) +
            Math.min(source.content.length / 200, 25) +
            Math.min(related.length * 10, 25),
        ),
        rationale:
          'Ranked by freshness, available source detail, and same-category corroboration.',
      };
    })
    .filter((t) => t.sources.length >= 2)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
