import Link from 'next/link';
import { getArticles, getMetrics, displayDate } from '../interfaces/web/data';
import { ArticleIndex } from '../interfaces/web/article-index';
export default async function Home() {
  const [articles, runs] = await Promise.all([getArticles(), getMetrics()]);
  const latest = runs.at(-1);
  return (
    <div className="shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow">
            <span className="tiny-dot" /> THE ENGINEERING INTELLIGENCE BRIEF
          </div>
          <h1 id="hero-title">
            Find the signal.
            <br />
            <span>Build what’s next.</span>
          </h1>
          <p>
            Engineering moves fast. We turn trusted technical updates into
            thoughtful, source-grounded reads. Researched by AI. Challenged by
            AI. Checked before publication.
          </p>
          <div className="hero-actions">
            <Link href="#dispatches" className="button">
              Explore dispatches <span aria-hidden="true">↓</span>
            </Link>
            <Link href="/about/" className="text-link">
              How it works <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="hero-footnote">
            <span>01 ARTICLE MAX / DAY</span>
            <span>02+ PRIMARY SOURCES</span>
            <span>85/100 MIN REVIEW</span>
          </div>
        </div>
        <div className="signal-panel" aria-label="Publication quality process">
          <div className="panel-header">
            <span>THE SIGNAL ENGINE</span>
            <span className="panel-version">
              v1.0 <span className="tiny-dot" />
            </span>
          </div>
          <div className="signal-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="signal-core">
              ds<span>_</span>
            </div>
            <span className="orbit-node node-one">TS</span>
            <span className="orbit-node node-two">AI</span>
            <span className="orbit-node node-three">JS</span>
            <div className="axis axis-x" />
            <div className="axis axis-y" />
          </div>
          <div className="signal-caption">
            <span className="tiny-dot" /> FROM PUBLIC SOURCES TO USEFUL
            KNOWLEDGE
          </div>
          <div className="panel-stages">
            <div>
              <span>01</span> Collect <b>↗</b>
            </div>
            <div>
              <span>02</span> Question <b>↗</b>
            </div>
            <div>
              <span>03</span> Validate <b>✓</b>
            </div>
          </div>
          <div className="panel-bottom">
            <span>AUTONOMOUS PROCESS</span>
            <span>HUMAN-READABLE RESULTS</span>
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <span className="eyebrow">FOLLOWING THE SOURCE</span>
        <span>
          React <span className="source-mark">⚛</span>
        </span>
        <span>
          Next.js <span className="source-mark">↗</span>
        </span>
        <span>
          TypeScript <span className="ts-mark">TS</span>
        </span>
        <span>
          Node.js <span className="source-mark">⬡</span>
        </span>
        <span>
          AI engineering <span className="source-mark">✳</span>
        </span>
      </div>
      <ArticleIndex
        articles={articles.map(({ draft, review, publishedAt }) => ({
          slug: draft.slug,
          title: draft.title,
          summary: draft.summary,
          category: draft.category,
          date: displayDate(publishedAt),
          score: review.overall,
          sourceCount: draft.sources.length,
        }))}
      />
      <section className="standards-grid" aria-labelledby="standards-title">
        <div className="standards-intro">
          <span className="eyebrow">A HIGHER BAR FOR AI CONTENT</span>
          <h2 id="standards-title">
            Every dispatch <br />
            earns its place.
          </h2>
          <Link href="/about/" className="text-link">
            Inside our process ↗
          </Link>
        </div>
        <div className="standard">
          <span className="standard-number">01 / GROUNDED</span>
          <h3>Sources you can inspect.</h3>
          <p>
            Official documentation, engineering blogs, and release notes. Every
            citation traces back to collected material.
          </p>
        </div>
        <div className="standard">
          <span className="standard-number">02 / CHALLENGED</span>
          <h3>A second opinion, built in.</h3>
          <p>
            A separate reviewer evaluates six dimensions. Unsupported claims
            stop the article from moving forward.
          </p>
        </div>
        <div className="standard">
          <span className="standard-number">03 / CHECKED</span>
          <h3>More than a good score.</h3>
          <p>
            Code must type-check. Topics must be distinct. Safety checks, tests,
            and linting must all pass.
          </p>
        </div>
      </section>
      <Link href="/status/" className="pipeline-banner">
        <span>
          <span className="status-dot" /> Pipeline transparency
        </span>
        <span className="muted">
          {latest
            ? `Last committed run: ${displayDate(latest.finishedAt)} · ${latest.publicationResult}`
            : 'No live runs recorded yet. The publication is ready for its first run.'}
        </span>
        <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
