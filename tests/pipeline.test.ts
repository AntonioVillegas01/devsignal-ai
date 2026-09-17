import { describe, expect, it } from 'vitest';
import { createContainer } from '../src/container';
import { QuotaExhaustedError } from '../src/domain/errors/pipeline-error';
import {
  GetArticleBySlugQuery,
  GetPipelineMetricsQuery,
  GetPublishedArticlesQuery,
  FindSimilarTopicsQuery,
} from '../src/application/queries';
import {
  FakeLlm,
  FakeSources,
  MemoryArticles,
  MemoryState,
  silentTelemetry,
} from './fixtures/fakes';
import {
  fixtureDraft,
  fixtureNow,
  fixtureReview,
  fixtureSources,
} from './fixtures/data';
function setup(responses?: unknown[]) {
  const llm = new FakeLlm(responses),
    articles = new MemoryArticles(),
    state = new MemoryState();
  const container = createContainer(process.cwd(), {
    llm,
    articles,
    state,
    sources: new FakeSources(),
    clock: { now: () => new Date(fixtureNow) },
    checks: {
      async run() {
        return [];
      },
    },
    telemetry: silentTelemetry,
  });
  return { ...container, memory: { articles, state }, fake: llm };
}
describe('research, review and publication orchestration', () => {
  it('publishes one schema-validated article end to end using fake adapters', async () => {
    const c = setup();
    const result = await c.run.execute();
    expect(result.publicationResult).toBe('published');
    expect(result.llmCalls).toBe(2);
    expect(c.memory.articles.writes).toBe(1);
    expect(c.memory.state.writes).toBe(1);
    expect(c.fake.requests.map((r) => r.role)).toEqual([
      'researcher',
      'reviewer',
    ]);
    expect(c.fake.requests[1]?.data).toEqual({
      draft: fixtureDraft,
      sources: fixtureSources,
    });
  });
  it('makes a single revision and independent second review', async () => {
    const rejected = {
      ...fixtureReview,
      overall: 80,
      approved: false,
      feedback: ['Explain the boundary more clearly'],
    };
    const c = setup([fixtureDraft, rejected, fixtureDraft, fixtureReview]);
    const result = await c.run.execute();
    expect(result.publicationResult).toBe('published');
    expect(result.reviewScores).toEqual([80, 91]);
    expect(result.llmCalls).toBe(4);
    expect(c.fake.requests[2]?.data).toMatchObject({
      revision: {
        feedback: expect.arrayContaining(['Explain the boundary more clearly']),
      },
    });
  });
  it('never publishes when the revision fails review', async () => {
    const rejected = {
      ...fixtureReview,
      unsupportedClaims: ['Unsupported promise'],
      approved: false,
    };
    const c = setup([fixtureDraft, rejected, fixtureDraft, rejected]);
    expect((await c.run.execute()).publicationResult).toBe('rejected');
    expect(c.memory.articles.writes).toBe(0);
    expect(c.fake.requests).toHaveLength(4);
  });
  it('does not publish an invented citation even when the reviewer approves', async () => {
    const draft = {
      ...fixtureDraft,
      sources: [fixtureSources[0]!.url, 'https://react.dev/invented'],
    };
    const c = setup([draft, fixtureReview, draft, fixtureReview]);
    const result = await c.run.execute();
    expect(result.publicationResult).toBe('rejected');
    expect(result.validationFailures).toContain('citation_not_ingested');
    expect(c.memory.articles.writes).toBe(0);
  });
  it('rejects incorrect code despite a passing review', async () => {
    const draft = {
      ...fixtureDraft,
      typescript: `${fixtureDraft.typescript}\nconst invalid: number = "no";`,
    };
    const c = setup([draft, fixtureReview, draft, fixtureReview]);
    expect((await c.run.execute()).publicationResult).toBe('rejected');
    expect(c.memory.articles.writes).toBe(0);
  });
  it('handles quota exhaustion, including during revision, without publishing', async () => {
    for (const responses of [
      [new QuotaExhaustedError()],
      [
        fixtureDraft,
        { ...fixtureReview, approved: false },
        new QuotaExhaustedError(),
      ],
    ]) {
      const c = setup(responses);
      const result = await c.run.execute();
      expect(result.publicationResult).toBe('skipped');
      expect(result.failureCategory).toBe('quota_exhausted');
      expect(c.memory.articles.writes).toBe(0);
    }
  });
  it('fails closed on malformed model output', async () => {
    const c = setup([{ title: 'Missing required fields' }]);
    expect((await c.run.execute()).publicationResult).toBe('failed');
    expect(c.memory.articles.writes).toBe(0);
  });
  it('has no writes in dry-run mode, including state writes', async () => {
    const c = setup();
    const result = await c.run.execute(true);
    expect(result.publicationResult).toBe('dry-run');
    expect(c.memory.articles.writes).toBe(0);
    expect(c.memory.state.writes).toBe(0);
  });
  it('does not generate when the daily limit was reached', async () => {
    const c = setup();
    await c.run.execute();
    const result = await c.run.execute();
    expect(result.failureCategory).toBe('daily_limit');
    expect(c.fake.requests).toHaveLength(2);
    expect(c.memory.articles.writes).toBe(1);
  });
  it('does not publish when project checks fail', async () => {
    const articles = new MemoryArticles();
    const c = createContainer(process.cwd(), {
      llm: new FakeLlm(),
      articles,
      state: new MemoryState(),
      sources: new FakeSources(),
      clock: { now: () => new Date(fixtureNow) },
      telemetry: silentTelemetry,
      checks: {
        async run() {
          return ['project_check:lint'];
        },
      },
    });
    expect((await c.run.execute()).validationFailures).toContain(
      'project_check:lint',
    );
    expect(articles.writes).toBe(0);
  });
  it('revalidates at the publish boundary instead of trusting a stored validation flag', async () => {
    const c = setup();
    const bad = {
      ...fixtureDraft,
      typescript: `${fixtureDraft.typescript}\n// @ts-nocheck`,
    };
    expect(
      (await c.publish.execute(bad, fixtureReview, fixtureSources)).passed,
    ).toBe(false);
    expect(c.memory.articles.writes).toBe(0);
  });
  it('all query handlers remain read-only', async () => {
    const c = setup();
    await c.run.execute();
    const before = structuredClone({
      articles: c.memory.articles.values,
      state: c.memory.state.value,
    });
    await new GetPublishedArticlesQuery(c.articles).execute();
    await new GetArticleBySlugQuery(c.articles).execute(fixtureDraft.slug);
    await new FindSimilarTopicsQuery(c.articles, 0.65).execute(
      fixtureDraft.title,
    );
    await new GetPipelineMetricsQuery(c.state).execute();
    expect({
      articles: c.memory.articles.values,
      state: c.memory.state.value,
    }).toEqual(before);
    expect(c.memory.articles.writes).toBe(1);
    expect(c.memory.state.writes).toBe(1);
  });
});

describe('pipeline preflight and no-op outcomes', () => {
  it('returns a successful skip without spending calls when there is no source-backed topic', async () => {
    const llm = new FakeLlm();
    const articles = new MemoryArticles();
    const c = createContainer(process.cwd(), {
      llm,
      articles,
      state: new MemoryState(),
      sources: {
        async collect() {
          return [];
        },
      },
      clock: { now: () => new Date(fixtureNow) },
      checks: {
        async run() {
          return [];
        },
      },
      telemetry: silentTelemetry,
    });
    expect(await c.run.execute()).toMatchObject({
      publicationResult: 'skipped',
      failureCategory: 'no_suitable_topic',
      llmCalls: 0,
    });
    expect(articles.writes).toBe(0);
  });
  it('checks state integrity before generating or publishing', async () => {
    const articles = new MemoryArticles();
    const llm = new FakeLlm();
    const c = createContainer(process.cwd(), {
      articles,
      llm,
      state: {
        async read() {
          throw new Error('Corrupt state');
        },
        async save() {
          throw new Error('Must not overwrite corrupt state');
        },
      },
      sources: new FakeSources(),
      clock: { now: () => new Date(fixtureNow) },
      telemetry: silentTelemetry,
    });
    expect((await c.run.execute()).publicationResult).toBe('failed');
    expect(articles.writes).toBe(0);
    expect(llm.requests).toHaveLength(0);
  });
  it('skips a previously used primary source even on a later UTC day', async () => {
    const c = setup();
    await c.run.execute();
    const llm = new FakeLlm();
    const next = createContainer(process.cwd(), {
      llm,
      articles: c.articles,
      state: c.state,
      sources: new FakeSources(),
      clock: { now: () => new Date('2026-09-19T06:00:00.000Z') },
      telemetry: silentTelemetry,
    });
    expect(await next.run.execute()).toMatchObject({
      publicationResult: 'skipped',
      failureCategory: 'no_suitable_topic',
      llmCalls: 0,
    });
    expect(c.memory.articles.writes).toBe(1);
  });
});
