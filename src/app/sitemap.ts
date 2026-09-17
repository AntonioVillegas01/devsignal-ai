import type { MetadataRoute } from 'next';
import { getArticles, siteUrl } from '../interfaces/web/data';
export const dynamic = 'force-static';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: `${siteUrl}/` },
    { url: `${siteUrl}/about/` },
    { url: `${siteUrl}/status/` },
    ...(await getArticles()).map((article) => ({
      url: `${siteUrl}/articles/${article.draft.slug}/`,
      lastModified: article.publishedAt,
    })),
  ];
}
