import type { Metadata } from 'next';
import { getMetrics, displayDate } from '../../interfaces/web/data';
export const metadata: Metadata = {
  title: 'Pipeline transparency',
  description:
    'Inspect committed publication metrics, review scores, and validation outcomes.',
};
export default async function StatusPage() {
  const runs = await getMetrics(),
    latest = runs.at(-1);
  const published = runs.filter(
    (run) => run.publicationResult === 'published',
  ).length;
  return (
    <div className="shell inner-page">
      <span className="eyebrow">OBSERVABILITY / PUBLIC BY DEFAULT</span>
      <h1>
        Nothing behind
        <br />
        <span>the curtain.</span>
      </h1>
      <p className="page-lead">
        Every published dispatch leaves a trail. These are the non-sensitive
        metrics committed with the publication, not a live service monitor.
      </p>
      <div className="metric-grid">
        <div>
          <span>RECORDED RUNS</span>
          <strong>{runs.length}</strong>
        </div>
        <div>
          <span>PUBLISHED DISPATCHES</span>
          <strong>{published}</strong>
        </div>
        <div>
          <span>RECORDED LLM CALLS</span>
          <strong>{runs.reduce((sum, run) => sum + run.llmCalls, 0)}</strong>
        </div>
        <div>
          <span>LATEST RESULT</span>
          <strong className="metric-word">
            {latest?.publicationResult ?? 'Not run'}
          </strong>
        </div>
      </div>
      <div className="notice">
        Skipped and failed runs appear in GitHub Actions logs and their
        downloadable metrics artifact. They do not trigger content commits, so
        this page may lag behind the most recent execution.
      </div>
      <section className="run-history">
        <div className="section-heading">
          <h2>Run history</h2>
          <span className="eyebrow">UP TO 90 COMMITTED RUNS</span>
        </div>
        {runs.length ? (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Committed pipeline runs</caption>
              <thead>
                <tr>
                  <th>Finished (UTC)</th>
                  <th>Topic</th>
                  <th>Sources</th>
                  <th>Calls / tokens</th>
                  <th>Review</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {[...runs].reverse().map((run) => (
                  <tr key={run.startedAt}>
                    <td>
                      <time dateTime={run.finishedAt}>
                        {displayDate(run.finishedAt)}
                      </time>
                    </td>
                    <td>
                      {run.selectedTopic ?? 'No topic'}
                      {run.failureCategory && (
                        <small>{run.failureCategory}</small>
                      )}
                      {run.validationFailures.map((failure) => (
                        <small key={failure}>{failure}</small>
                      ))}
                    </td>
                    <td>{run.sourcesCollected}</td>
                    <td>
                      {run.llmCalls} /{' '}
                      {run.estimatedTokens.toLocaleString('en')}
                    </td>
                    <td>{run.reviewScores.join(' → ') || '—'}</td>
                    <td>
                      <span className="result-tag">
                        {run.publicationResult}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-history">
            <span className="empty-icon">⌁</span>
            <h3>A clean starting point.</h3>
            <p>
              No pipeline runs have been committed. Configure Gemini and the
              daily workflow to begin collecting real results.
            </p>
          </div>
        )}
      </section>
      <div className="status-explainer">
        <h2>What the numbers mean</h2>
        <p>
          Review scores are independent model assessments across factual
          grounding, technical depth, clarity, usefulness, source quality, and
          originality. Publication requires at least 85 overall and 80 in every
          category, with no unsupported claims.
        </p>
        <p>
          Token usage comes from the provider when available; otherwise it is
          conservatively estimated from input length and the configured output
          ceiling. No API keys, raw prompts, or account details are included.
        </p>
      </div>
    </div>
  );
}
