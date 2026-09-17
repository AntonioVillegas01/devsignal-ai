import { describe, expect, it } from 'vitest';
import { draftSchema, reviewSchema } from '../src/domain/entities/models';
import {
  normalizeSources,
  rankTopics,
  similarity,
  findSimilarTopics,
} from '../src/domain/services/topics';
import { draftFailures, reviewPasses } from '../src/domain/services/quality';
import { canonicalUrl } from '../src/domain/value-objects/url';
import { configSchema } from '../src/config';
import { trustedDomains } from '../src/config/sources';
import {
  fixtureDraft,
  fixtureNow,
  fixtureReview,
  fixtureSources,
} from './fixtures/data';
const article = {
  draft: fixtureDraft,
  review: fixtureReview,
  sourceSnapshot: fixtureSources,
  publishedAt: fixtureNow,
  validation: { passed: true as const, failures: [], checkedAt: fixtureNow },
};
describe('source normalization and ranking', () => {
  it('deduplicates canonical URLs and excludes old, future, and untrusted updates', () => {
    const first = fixtureSources[0]!;
    const raw = [
      first,
      { ...first, url: `${first.url}?utm_source=test#heading` },
      { ...first, url: 'https://evil.test/source' },
      {
        ...first,
        url: 'https://react.dev/old',
        publishedAt: '2020-01-01T00:00:00.000Z',
      },
      {
        ...first,
        url: 'https://react.dev/future',
        publishedAt: '2099-01-01T00:00:00.000Z',
      },
    ];
    expect(
      normalizeSources(raw, new Date(fixtureNow), 14, trustedDomains),
    ).toEqual([first]);
  });
  it('retains reference material without misrepresenting it as a recent update', () => {
    const reference = {
      ...fixtureSources[1]!,
      publishedAt: '2020-01-01T00:00:00.000Z',
    };
    expect(
      normalizeSources([reference], new Date(fixtureNow), 14, trustedDomains),
    ).toHaveLength(1);
    expect(rankTopics([reference], new Date(fixtureNow))).toHaveLength(0);
  });
  it('requires supporting sources and ranks recent detailed updates first', () => {
    const old = {
      ...fixtureSources[0]!,
      title: 'Older short update on parser types',
      url: 'https://www.typescriptlang.org/old',
      publishedAt: '2026-09-06T00:00:00.000Z',
      content: 'Short'.repeat(20),
    };
    expect(rankTopics([fixtureSources[0]!], new Date(fixtureNow))).toEqual([]);
    expect(
      rankTopics([...fixtureSources, old], new Date(fixtureNow))[0]?.title,
    ).toBe(fixtureSources[0]!.title);
  });
});
describe('deterministic quality policy', () => {
  it('detects overlapping topics without embeddings', () => {
    expect(
      similarity(
        'safe TypeScript runtime input validation',
        'TypeScript runtime input validation safe',
      ),
    ).toBe(1);
    expect(findSimilarTopics(fixtureDraft.title, [article], 0.65)).toHaveLength(
      1,
    );
    expect(
      findSimilarTopics(
        'React suspense streaming server rendering',
        [article],
        0.65,
      ),
    ).toEqual([]);
  });
  it('validates structured outputs and rejects missing fields and unsafe slugs', () => {
    expect(draftSchema.safeParse(fixtureDraft).success).toBe(true);
    expect(
      draftSchema.safeParse({ ...fixtureDraft, slug: '../secrets' }).success,
    ).toBe(false);
    expect(draftSchema.safeParse({ title: 'Nothing else here' }).success).toBe(
      false,
    );
    expect(
      reviewSchema.safeParse({ ...fixtureReview, overall: 101 }).success,
    ).toBe(false);
  });
  it('requires the overall score, actual mean, each category and no unsupported claims', () => {
    expect(reviewPasses(fixtureReview)).toBe(true);
    expect(reviewPasses({ ...fixtureReview, overall: 84 })).toBe(false);
    expect(
      reviewPasses({
        ...fixtureReview,
        scores: { ...fixtureReview.scores, factualGrounding: 79 },
      }),
    ).toBe(false);
    expect(
      reviewPasses({
        ...fixtureReview,
        scores: {
          factualGrounding: 80,
          technicalDepth: 80,
          clarity: 80,
          usefulness: 80,
          sourceQuality: 80,
          originality: 80,
        },
      }),
    ).toBe(false);
    expect(
      reviewPasses({
        ...fixtureReview,
        unsupportedClaims: ['Invented benchmark'],
      }),
    ).toBe(false);
    expect(
      reviewPasses({
        ...fixtureReview,
        inventedSources: ['Unknown documentation'],
      }),
    ).toBe(false);
    expect(reviewPasses({ ...fixtureReview, approved: false })).toBe(false);
  });
  it('allows only distinct URLs from ingested sources, including reference citations', () => {
    const failures = (sources: string[]) =>
      draftFailures(
        { ...fixtureDraft, sources },
        fixtureSources,
        [],
        0.65,
        trustedDomains,
      );
    expect(failures(fixtureDraft.sources)).toEqual([]);
    expect(
      failures([fixtureDraft.sources[0]!, fixtureDraft.sources[0]!]),
    ).toContain('insufficient_distinct_sources');
    expect(
      failures([fixtureDraft.sources[0]!, 'https://react.dev/invented']),
    ).toContain('citation_not_ingested');
    expect(
      failures([fixtureDraft.sources[0]!, 'javascript:alert(1)']),
    ).toContain('unsafe_source_url');
  });
  it('rejects generic sections, hidden links and repeated prose', () => {
    expect(
      draftFailures(
        { ...fixtureDraft, limitations: 'game changer '.repeat(30) },
        fixtureSources,
        [],
        0.65,
        trustedDomains,
      ),
    ).toContain('generic_section:8');
    expect(
      draftFailures(
        { ...fixtureDraft, limitations: fixtureDraft.tradeOffs },
        fixtureSources,
        [],
        0.65,
        trustedDomains,
      ),
    ).toContain('repeated_section:8');
    expect(
      draftFailures(
        {
          ...fixtureDraft,
          explanation: `${fixtureDraft.explanation} [link](https://evil.test)`,
        },
        fixtureSources,
        [],
        0.65,
        trustedDomains,
      ),
    ).toContain('unsafe_prose:3');
  });
  it('rejects credentials, HTTP, nonstandard ports, and lookalike domains', () => {
    for (const url of [
      'http://react.dev/',
      'https://secret@react.dev/',
      'https://react.dev:444/',
      'https://react.dev.evil.test/',
    ])
      expect(() => canonicalUrl(url, trustedDomains)).toThrow();
  });
  it('enforces free-only model selection, bounded calls and minimum thresholds', () => {
    expect(configSchema.parse({}).GEMINI_MODEL).toBe('gemini-2.5-flash');
    for (const config of [
      { GEMINI_MODEL: 'gemini-2.5-pro' },
      { MAX_LLM_CALLS: '5' },
      { FREE_TIER_ONLY: 'false' },
      { MIN_REVIEW_SCORE: '70' },
    ])
      expect(configSchema.safeParse(config).success).toBe(false);
  });
});
