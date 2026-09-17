import { MarkdownArticleRepository } from '../../infrastructure/repositories/files';
import { TypeScriptSafety } from '../../infrastructure/publishing/code-safety';
import { ArticleMarkdown } from '../../infrastructure/publishing/markdown';
import { draftFailures, reviewPasses } from '../../domain/services/quality';
import { trustedDomains } from '../../config/sources';
export async function verifyContent(root = process.cwd()): Promise<number> {
  const articles = await new MarkdownArticleRepository(root).list();
  const safety = new TypeScriptSafety(),
    markdown = new ArticleMarkdown();
  for (const article of articles) {
    const failures = draftFailures(
      article.draft,
      article.sourceSnapshot,
      articles.filter((other) => other.draft.slug !== article.draft.slug),
      0.65,
      trustedDomains,
    );
    if (!reviewPasses(article.review) || article.validation.failures.length)
      failures.push('invalid_review_or_validation');
    if (
      safety.sanitize(markdown.render(article.draft)) !==
      markdown.render(article.draft)
    )
      failures.push('unsafe_markdown');
    failures.push(...(await safety.typecheck(article.draft.typescript)));
    if (failures.length)
      throw new Error(
        `Invalid published article ${article.draft.slug}: ${failures.join(', ')}`,
      );
  }
  return articles.length;
}
verifyContent()
  .then((count) => console.log(`Verified ${count} published articles.`))
  .catch(() => {
    console.error(
      'Published content verification failed. Run tests and inspect article provenance.',
    );
    process.exitCode = 1;
  });
