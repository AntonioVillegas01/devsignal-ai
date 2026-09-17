import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getArticle,
  getArticles,
  displayDate,
  siteUrl,
} from '../../../interfaces/web/data';
import {
  ArticleMarkdown,
  renderHtml,
} from '../../../infrastructure/publishing/markdown';
export const dynamicParams = false;
export const dynamic = 'force-static';
export async function generateStaticParams() {
  const slugs = (await getArticles()).map(({ draft }) => ({
    slug: draft.slug,
  }));
  return slugs.length ? slugs : [{ slug: 'no-dispatches' }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return { title: 'Article not found', robots: { index: false } };
  return {
    title: article.draft.title,
    description: article.draft.summary,
    alternates: { canonical: `${siteUrl}/articles/${article.draft.slug}/` },
    openGraph: {
      type: 'article',
      title: article.draft.title,
      description: article.draft.summary,
      publishedTime: article.publishedAt,
    },
  };
}
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();
  const { draft, review, validation, publishedAt } = article;
  const html = await renderHtml(new ArticleMarkdown().render(draft));
  return (
    <div className="shell article-page">
      <Link href="/#dispatches" className="text-link">
        ← All dispatches
      </Link>
      <header className="article-heading">
        <span className="eyebrow">{draft.category} / ENGINEERING DISPATCH</span>
        <h1>{draft.title}</h1>
        <p>{draft.summary}</p>
        <div className="article-meta">
          <time dateTime={publishedAt}>{displayDate(publishedAt)}</time>
          <span>AI-generated · Gemini Flash</span>
          <span>{draft.sources.length} primary sources</span>
        </div>
      </header>
      <div className="article-layout">
        <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        <aside className="review-panel">
          <span className="eyebrow">INDEPENDENT AI REVIEW</span>
          <div className="review-score">
            {review.overall}
            <span>/100</span>
          </div>
          <span className="validated">
            <span className="tiny-dot" /> Validation passed
          </span>
          <dl>
            {Object.entries(review.scores).map(([key, value]) => (
              <div key={key}>
                <dt>{key.replace(/([A-Z])/g, ' $1')}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>
            Checked {displayDate(validation.checkedAt)}. Code was type-checked,
            not executed. Automated review is not a guarantee of correctness.
          </p>
          <Link href="/about/" className="text-link">
            How we validate ↗
          </Link>
        </aside>
      </div>
    </div>
  );
}
