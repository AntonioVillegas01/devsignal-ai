import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Our approach',
  description:
    'How DevSignal AI collects sources, reviews articles, and decides what to publish.',
};
const steps = [
  [
    'Collect the evidence',
    'Read configured official feeds, release notes, and documentation. Bound every request, reject untrusted URLs, normalize dates, and remove stale updates.',
  ],
  [
    'Choose a useful topic',
    'Rank updates by freshness and available evidence. Compare candidate topics with the archive using deterministic token similarity before spending an AI call.',
  ],
  [
    'Research with boundaries',
    'Gemini Flash receives only the collected material. It writes structured sections, provides a self-contained TypeScript example, and selects citations from that evidence.',
  ],
  [
    'Invite a skeptical reviewer',
    'A fresh, separate AI call checks the draft against its sources. It scores six dimensions and identifies unsupported claims. One revision is allowed.',
  ],
  [
    'Make the checks deterministic',
    'Validate schemas and citations, check topic similarity, sanitize Markdown, and type-check the code. Project tests and linting must pass before storage.',
  ],
  [
    'Publish with a trail',
    'Save approved content as Markdown and review metadata as JSON. GitHub Actions verifies changes, commits meaningful content, and deploys a static site to GitHub Pages.',
  ],
];
export default function AboutPage() {
  return (
    <div className="shell inner-page about-page">
      <span className="eyebrow">OUR APPROACH</span>
      <h1>
        Intelligence needs
        <br />
        <span>accountability.</span>
      </h1>
      <p className="page-lead">
        DevSignal AI is an educational engineering publication and an open
        implementation of a bounded autonomous workflow. AI does the research.
        Explicit rules decide whether it reaches the page.
      </p>
      <div className="process-list">
        {steps.map(([title, description], i) => (
          <section key={title}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <span className="process-arrow" aria-hidden="true">
              ↘
            </span>
          </section>
        ))}
      </div>
      <div className="about-notes">
        <section>
          <span className="eyebrow">THE HONEST LIMITS</span>
          <h2>Checked does not mean infallible.</h2>
          <p>
            The researcher and reviewer use separate requests, but may share the
            same model and its blind spots. Automated review cannot prove
            factual correctness. Type-checking catches type errors; it does not
            prove runtime behavior. Examples are never executed on the
            publishing machine.
          </p>
          <p>
            Follow the primary sources, test code in your own environment, and
            treat publication as a starting point for engineering judgment.
          </p>
        </section>
        <section>
          <span className="eyebrow">SMALL BY DESIGN</span>
          <h2>One article. Zero infrastructure bills.</h2>
          <p>
            The default is at most one article per day, with at most four model
            calls and no paid fallback. A public GitHub repository, GitHub
            Pages, and a Gemini Free Tier project with billing disabled are the
            intended operating environment.
          </p>
          <p>
            Free quotas, model availability, and scheduled workflow timing are
            controlled by their providers. When quota runs out, the pipeline
            stops without publishing.
          </p>
        </section>
      </div>
    </div>
  );
}
