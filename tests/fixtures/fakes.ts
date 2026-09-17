import type {
  ArticleRepositoryPort,
  LlmPort,
  PipelineStateRepositoryPort,
  TelemetryPort,
  SourceProviderPort,
} from '../../src/application/ports';
import type { Article, PipelineState } from '../../src/domain/entities/models';
import { fixtureDraft, fixtureReview, fixtureSources } from './data';
export class MemoryArticles implements ArticleRepositoryPort {
  values: Article[] = [];
  writes = 0;
  async list() {
    return structuredClone(this.values);
  }
  async get(slug: string) {
    return structuredClone(
      this.values.find((a) => a.draft.slug === slug) ?? null,
    );
  }
  async save(article: Article) {
    this.writes++;
    this.values.push(structuredClone(article));
  }
}
export class MemoryState implements PipelineStateRepositoryPort {
  value: PipelineState = { version: 1, runs: [] };
  writes = 0;
  async read() {
    return structuredClone(this.value);
  }
  async save(state: PipelineState) {
    this.writes++;
    this.value = structuredClone(state);
  }
}
export class FakeLlm implements LlmPort {
  requests: Parameters<LlmPort['generate']>[0][] = [];
  constructor(public responses: unknown[] = [fixtureDraft, fixtureReview]) {}
  usage() {
    return {
      calls: this.requests.length,
      estimatedTokens: this.requests.length * 100,
    };
  }
  async generate<T>(
    request: Parameters<LlmPort['generate']>[0] & {
      schema: import('zod').z.ZodType<T>;
    },
  ): Promise<T> {
    this.requests.push(request);
    const response = this.responses.shift();
    if (response instanceof Error) throw response;
    return request.schema.parse(structuredClone(response));
  }
}
export class FakeSources implements SourceProviderPort {
  async collect() {
    return structuredClone(fixtureSources);
  }
}
export const silentTelemetry: TelemetryPort = { event() {} };
