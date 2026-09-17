import type {
  ArticleRepositoryPort,
  PipelineStateRepositoryPort,
} from '../ports';
import { findSimilarTopics } from '../../domain/services/topics';
export class GetPublishedArticlesQuery {
  constructor(private repository: Pick<ArticleRepositoryPort, 'list'>) {}
  execute() {
    return this.repository.list();
  }
}
export class GetArticleBySlugQuery {
  constructor(private repository: Pick<ArticleRepositoryPort, 'get'>) {}
  execute(slug: string) {
    return this.repository.get(slug);
  }
}
export class FindSimilarTopicsQuery {
  constructor(
    private repository: Pick<ArticleRepositoryPort, 'list'>,
    private threshold: number,
  ) {}
  async execute(text: string) {
    return findSimilarTopics(
      text,
      await this.repository.list(),
      this.threshold,
    );
  }
}
export class GetPipelineMetricsQuery {
  constructor(private repository: Pick<PipelineStateRepositoryPort, 'read'>) {}
  async execute() {
    return (await this.repository.read()).runs;
  }
}
