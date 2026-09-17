import type { Metrics, PipelineState } from '../../domain/entities/models';
import { PipelineError } from '../../domain/errors/pipeline-error';
import { reviewPasses } from '../../domain/services/quality';
import type {
  ArticleRepositoryPort,
  ClockPort,
  LlmPort,
  PipelineStateRepositoryPort,
  TelemetryPort,
} from '../ports';
import type { Policy } from '../dto/policy';
import { FindSimilarTopicsQuery } from '../queries';
import type {
  CollectSourcesCommand,
  GenerateArticleCommand,
  PublishArticleCommand,
  RankTopicsCommand,
  ReviewArticleCommand,
  ValidateArticleCommand,
} from './stages';
export class RunDailyPipelineCommand {
  constructor(
    private d: {
      collect: CollectSourcesCommand;
      rank: RankTopicsCommand;
      generate: GenerateArticleCommand;
      review: ReviewArticleCommand;
      validate: ValidateArticleCommand;
      publish: PublishArticleCommand;
      articles: ArticleRepositoryPort;
      state: PipelineStateRepositoryPort;
      clock: ClockPort;
      llm: LlmPort;
      telemetry: TelemetryPort;
      policy: Policy;
    },
  ) {}
  async execute(dryRun = false): Promise<Metrics> {
    const d = this.d;
    const startedAt = d.clock.now().toISOString();
    const metrics: Metrics = {
      startedAt,
      finishedAt: startedAt,
      sourcesCollected: 0,
      candidatesEvaluated: 0,
      llmCalls: 0,
      estimatedTokens: 0,
      selectedTopic: null,
      reviewScores: [],
      validationFailures: [],
      publicationResult: 'skipped',
      failureCategory: null,
    };
    let previousState: PipelineState | undefined;
    try {
      previousState = await d.state.read();
      const today = startedAt.slice(0, 10);
      if (
        (await d.articles.list()).filter((a) => a.publishedAt.startsWith(today))
          .length >= d.policy.maxArticlesPerDay
      )
        throw new PipelineError('daily_limit', 'Daily limit reached');
      const sources = await d.collect.execute();
      metrics.sourcesCollected = sources.length;
      const candidates = d.rank.execute(sources);
      metrics.candidatesEvaluated = candidates.length;
      const similar = new FindSimilarTopicsQuery(
        d.articles,
        d.policy.duplicateThreshold,
      );
      let selected;
      const articles = await d.articles.list();
      for (const candidate of candidates) {
        if (
          !(await similar.execute(candidate.title)).length &&
          !articles.some(
            (a) => a.sourceSnapshot[0]?.url === candidate.sources[0]?.url,
          )
        ) {
          selected = candidate;
          break;
        }
      }
      if (!selected) {
        metrics.failureCategory = 'no_suitable_topic';
      } else {
        metrics.selectedTopic = selected.title;
        let draft = await d.generate.execute(selected);
        let review = await d.review.execute(draft, selected.sources);
        metrics.reviewScores.push(review.overall);
        let validation = await d.validate.execute(
          draft,
          review,
          selected.sources,
        );
        if (
          !reviewPasses(
            review,
            d.policy.minReviewScore,
            d.policy.minCategoryScore,
          ) ||
          !validation.passed
        ) {
          draft = await d.generate.execute(selected, {
            draft,
            feedback: [
              ...review.feedback,
              ...review.unsupportedClaims,
              ...review.inventedSources,
              ...validation.failures,
            ],
          });
          review = await d.review.execute(draft, selected.sources);
          metrics.reviewScores.push(review.overall);
        }
        validation = await d.publish.execute(
          draft,
          review,
          selected.sources,
          dryRun,
        );
        metrics.validationFailures = validation.failures;
        metrics.publicationResult = validation.passed
          ? dryRun
            ? 'dry-run'
            : 'published'
          : 'rejected';
        if (!validation.passed) metrics.failureCategory = 'quality_gate';
      }
    } catch (error) {
      const category =
        error instanceof PipelineError ? error.category : 'unexpected_error';
      metrics.failureCategory = category;
      metrics.publicationResult = [
        'quota_exhausted',
        'call_budget',
        'daily_limit',
        'missing_api_key',
      ].includes(category)
        ? 'skipped'
        : 'failed';
    }
    const usage = d.llm.usage();
    metrics.llmCalls = usage.calls;
    metrics.estimatedTokens = usage.estimatedTokens;
    metrics.finishedAt = d.clock.now().toISOString();
    // Persist bounded, non-sensitive metrics even on rejection; GitHub commits only on actual publication.
    if (!dryRun && previousState) {
      await d.state.save({
        version: 1,
        runs: [...previousState.runs, metrics].slice(-90),
      });
    }
    d.telemetry.event('pipeline_finished', {
      result: metrics.publicationResult,
      failureCategory: metrics.failureCategory,
      llmCalls: metrics.llmCalls,
    });
    return metrics;
  }
}
