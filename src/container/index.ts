import { loadConfig, toPolicy } from '../config';
import { sourceDefinitions, trustedDomains } from '../config/sources';
import { createLlm } from '../infrastructure/ai/provider';
import { SafeFetcher } from '../infrastructure/sources/safe-fetch';
import { TrustedSourcesProvider } from '../infrastructure/sources/providers';
import {
  MarkdownArticleRepository,
  JsonPipelineStateRepository,
} from '../infrastructure/repositories/files';
import {
  ConsoleTelemetry,
  SystemClock,
} from '../infrastructure/observability/console';
import { TypeScriptSafety } from '../infrastructure/publishing/code-safety';
import { ArticleMarkdown } from '../infrastructure/publishing/markdown';
import { NpmProjectChecks } from '../infrastructure/publishing/project-checks';
import { LocalPublisher } from '../infrastructure/publishing/local-publisher';
import {
  CollectSourcesCommand,
  RankTopicsCommand,
  GenerateArticleCommand,
  ReviewArticleCommand,
  ValidateArticleCommand,
  PublishArticleCommand,
} from '../application/commands/stages';
import { RunDailyPipelineCommand } from '../application/commands/run-daily-pipeline';
import type {
  ArticleRepositoryPort,
  ClockPort,
  LlmPort,
  PipelineStateRepositoryPort,
  ProjectChecksPort,
  SourceProviderPort,
  TelemetryPort,
} from '../application/ports';
export function createContainer(
  root = process.cwd(),
  overrides: Partial<{
    llm: LlmPort;
    sources: SourceProviderPort;
    articles: ArticleRepositoryPort;
    state: PipelineStateRepositoryPort;
    clock: ClockPort;
    checks: ProjectChecksPort;
    telemetry: TelemetryPort;
  }> = {},
) {
  const config = loadConfig(),
    policy = toPolicy(config);
  const clock = overrides.clock ?? new SystemClock(),
    telemetry = overrides.telemetry ?? new ConsoleTelemetry();
  const llm = overrides.llm ?? createLlm(config);
  const articles = overrides.articles ?? new MarkdownArticleRepository(root),
    state = overrides.state ?? new JsonPipelineStateRepository(root);
  const sources =
    overrides.sources ??
    new TrustedSourcesProvider(
      sourceDefinitions,
      new SafeFetcher(trustedDomains),
      clock,
      telemetry,
    );
  const checks = overrides.checks ?? new NpmProjectChecks(root, telemetry);
  const collect = new CollectSourcesCommand(sources, clock, policy),
    rank = new RankTopicsCommand(clock);
  const generate = new GenerateArticleCommand(llm),
    review = new ReviewArticleCommand(llm);
  const validate = new ValidateArticleCommand(
    articles,
    new TypeScriptSafety(),
    new ArticleMarkdown(),
    clock,
    policy,
  );
  const publish = new PublishArticleCommand(
    validate,
    checks,
    new LocalPublisher(articles),
    articles,
    clock,
    policy,
  );
  const dependencies = {
    collect,
    rank,
    generate,
    review,
    validate,
    publish,
    articles,
    state,
    clock,
    llm,
    telemetry,
    policy,
  };
  return { ...dependencies, run: new RunDailyPipelineCommand(dependencies) };
}
