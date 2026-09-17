'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Category } from '../../domain/entities/models';
export interface ArticleCard {
  slug: string;
  title: string;
  summary: string;
  category: Category;
  date: string;
  score: number;
  sourceCount: number;
}
const categories = [
  'All topics',
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
  'AI engineering',
] as const;
export function ArticleIndex({ articles }: { articles: ArticleCard[] }) {
  const [category, setCategory] = useState<string>('All topics');
  const filtered = articles.filter(
    (article) => category === 'All topics' || article.category === category,
  );
  return (
    <section
      id="dispatches"
      className="dispatches"
      aria-labelledby="dispatches-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE PUBLICATION</span>
          <h2 id="dispatches-title">
            Latest dispatches
            <span className="count">
              {String(articles.length).padStart(2, '0')}
            </span>
          </h2>
        </div>
        <span className="small muted">
          One considered read. When it earns your time.
        </span>
      </div>
      <div className="filters" aria-label="Filter by topic">
        {categories.map((item) => (
          <button
            key={item}
            aria-pressed={category === item}
            className={category === item ? 'selected' : ''}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {filtered.length} articles in {category}
      </div>
      {filtered.length ? (
        <div className="article-grid">
          {filtered.map((article, index) => (
            <article className="article-card" key={article.slug}>
              <div className="card-top">
                <span className="topic-label">{article.category}</span>
                <span className="small muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3>
                <Link href={`/articles/${article.slug}/`}>{article.title}</Link>
              </h3>
              <p>{article.summary}</p>
              <div className="card-bottom">
                <time>{article.date}</time>
                <span className="score">
                  {article.score}
                  <span>/100</span> <span aria-label="AI reviewed">↗</span>
                </span>
              </div>
              <div className="card-source">
                {article.sourceCount} primary sources{' '}
                <span>
                  Validated <span className="tiny-dot" />
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-dispatch">
          <div className="empty-icon" aria-hidden="true">
            ⌁
          </div>
          <div>
            <span className="eyebrow">
              {articles.length
                ? 'NO MATCHING DISPATCHES'
                : 'QUALITY BEFORE CADENCE'}
            </span>
            <h3>
              {articles.length
                ? `No ${category} articles yet.`
                : 'The first signal is still taking shape.'}
            </h3>
            <p>
              {articles.length
                ? 'Explore another topic to see the latest published work.'
                : 'A quiet feed is better than a weak article. A dispatch appears here only after source checks, independent AI review, and code validation pass.'}
            </p>
            <Link href="/status/" className="text-link">
              See the pipeline <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="empty-stamp" aria-hidden="true">
            <span>DS / 001</span>
            <div className="wave">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <span>AWAITING VERIFIED SIGNAL</span>
          </div>
        </div>
      )}
    </section>
  );
}
