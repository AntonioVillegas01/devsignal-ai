import type { z } from 'zod';
import type {
  Article,
  Draft,
  PipelineState,
  Source,
} from '../../domain/entities/models';
export interface LlmPort {
  generate<T>(request: {
    role: 'researcher' | 'reviewer';
    instruction: string;
    data: unknown;
    schema: z.ZodType<T>;
  }): Promise<T>;
  usage(): { calls: number; estimatedTokens: number };
}
export interface SourceProviderPort {
  collect(): Promise<Source[]>;
}
export interface ArticleRepositoryPort {
  list(): Promise<Article[]>;
  get(slug: string): Promise<Article | null>;
  save(article: Article): Promise<void>;
}
export interface PipelineStateRepositoryPort {
  read(): Promise<PipelineState>;
  save(state: PipelineState): Promise<void>;
}
export interface PublisherPort {
  publish(article: Article): Promise<void>;
}
export interface TelemetryPort {
  event(
    name: string,
    fields?: Record<string, string | number | boolean | null>,
  ): void;
}
export interface ClockPort {
  now(): Date;
}
export interface ContentSafetyPort {
  sanitize(markdown: string): string;
  typecheck(code: string): Promise<string[]>;
}
export interface ProjectChecksPort {
  run(): Promise<string[]>;
}
export interface MarkdownPort {
  render(draft: Draft): string;
  extractTypeScript(markdown: string): string[];
}
