import { cache } from 'react';
import {
  MarkdownArticleRepository,
  JsonPipelineStateRepository,
} from '../../infrastructure/repositories/files';
import {
  GetPublishedArticlesQuery,
  GetPipelineMetricsQuery,
  GetArticleBySlugQuery,
} from '../../application/queries';
const articles = new MarkdownArticleRepository(process.cwd());
export const getArticles = cache(() =>
  new GetPublishedArticlesQuery(articles).execute(),
);
export const getArticle = cache((slug: string) =>
  new GetArticleBySlugQuery(articles).execute(slug),
);
export const getMetrics = cache(() =>
  new GetPipelineMetricsQuery(
    new JsonPipelineStateRepository(process.cwd()),
  ).execute(),
);
export const siteUrl =
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  ) + (process.env.NEXT_PUBLIC_BASE_PATH ?? '');
export function displayDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}
