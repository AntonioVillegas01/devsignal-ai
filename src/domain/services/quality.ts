import {
  draftSchema,
  reviewSchema,
  type Draft,
  type Review,
  type Source,
  type Article,
} from '../entities/models';
import { canonicalUrl } from '../value-objects/url';
import { findSimilarTopics, similarity, tokens } from './topics';
export function reviewPasses(
  value: Review,
  overall = 85,
  category = 80,
): boolean {
  const result = reviewSchema.safeParse(value);
  if (!result.success) return false;
  const r = result.data;
  const average =
    Object.values(r.scores).reduce((sum, score) => sum + score, 0) / 6;
  return (
    r.approved &&
    r.overall >= overall &&
    r.overall === Math.round(average) &&
    average >= overall &&
    Object.values(r.scores).every((s) => s >= category) &&
    r.unsupportedClaims.length === 0 &&
    r.inventedSources.length === 0
  );
}
export function draftFailures(
  draft: Draft,
  sources: readonly Source[],
  articles: readonly Article[],
  threshold: number,
  trusted: readonly string[],
): string[] {
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success)
    return parsed.error.issues.map((issue) => `schema:${issue.path.join('.')}`);
  const failures: string[] = [];
  if (
    articles.some((a) => a.draft.slug === draft.slug) ||
    findSimilarTopics(`${draft.title} ${draft.summary}`, articles, threshold)
      .length ||
    findSimilarTopics(draft.title, articles, threshold).length
  )
    failures.push('duplicate_topic');
  const ingested = new Set(sources.map((s) => s.url));
  const citations = new Set<string>();
  for (const url of draft.sources) {
    try {
      const canonical = canonicalUrl(url, trusted);
      if (canonical !== url || !ingested.has(canonical))
        failures.push('citation_not_ingested');
      citations.add(canonical);
    } catch {
      failures.push('unsafe_source_url');
    }
  }
  if (citations.size < 2) failures.push('insufficient_distinct_sources');
  const sections = [
    draft.summary,
    draft.whatChanged,
    draft.whyItMatters,
    draft.explanation,
    draft.considerations,
    draft.tradeOffs,
    draft.whenToUse,
    draft.whenNotToUse,
    draft.limitations,
  ];
  for (const [index, text] of sections.entries()) {
    if (
      tokens(text).size < 12 ||
      /\b(lorem ipsum|insert (?:code|text)|coming soon|todo|tbd|game.changer)\b/i.test(
        text,
      )
    )
      failures.push(`generic_section:${index}`);
    if (
      /```|~~~|<\/?[a-z][^>]*>|\]\s*\(|\]\s*\[|https?:\/\/|javascript:|data:/i.test(
        text,
      )
    )
      failures.push(`unsafe_prose:${index}`);
    if (
      sections.slice(0, index).some((other) => similarity(text, other) > 0.85)
    )
      failures.push(`repeated_section:${index}`);
  }
  if (/[<>\n\r\[\]`]/.test(draft.title)) failures.push('unsafe_title');
  if (draft.typescript.includes('```') || draft.typescript.includes('~~~'))
    failures.push('nested_code_fence');
  return [...new Set(failures)];
}
