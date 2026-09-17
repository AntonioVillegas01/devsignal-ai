import type {
  ArticleRepositoryPort,
  PublisherPort,
} from '../../application/ports';
import type { Article } from '../../domain/entities/models';
export class LocalPublisher implements PublisherPort {
  constructor(private repository: ArticleRepositoryPort) {}
  publish(article: Article) {
    return this.repository.save(article);
  }
}
