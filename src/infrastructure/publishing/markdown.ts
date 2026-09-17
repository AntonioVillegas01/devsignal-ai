import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import type { Draft } from '../../domain/entities/models';
import type { MarkdownPort } from '../../application/ports';
import { canonicalUrl } from '../../domain/value-objects/url';
const processor = unified()
  .use(remarkParse)
  .use(remarkStringify, { fences: true, bullet: '-' });
export class ArticleMarkdown implements MarkdownPort {
  extractTypeScript(markdown: string): string[] {
    return processor
      .parse(markdown)
      .children.flatMap((node) =>
        node.type === 'code' && node.lang === 'typescript' ? [node.value] : [],
      );
  }
  render(draft: Draft): string {
    const sections = [
      ['Executive summary', draft.summary],
      ['What changed', draft.whatChanged],
      ['Why it matters', draft.whyItMatters],
      ['Technical explanation', draft.explanation],
      [
        'Executable TypeScript example',
        `\`\`\`typescript\n${draft.typescript}\n\`\`\``,
      ],
      ['Implementation considerations', draft.considerations],
      ['Trade-offs', draft.tradeOffs],
      ['When to use it', draft.whenToUse],
      ['When not to use it', draft.whenNotToUse],
      ['Limitations', draft.limitations],
      [
        'Sources',
        draft.sources.map((url, i) => `- [Source ${i + 1}](${url})`).join('\n'),
      ],
    ];
    return processor.stringify(
      processor.parse(
        sections
          .map(([heading, text]) => `## ${heading}\n\n${text}`)
          .join('\n\n'),
      ),
    );
  }
}
interface TreeNode {
  type: string;
  url?: string;
  children?: TreeNode[];
}
export function sanitizeMarkdown(markdown: string): string {
  const root = processor.parse(markdown);
  function clean(node: TreeNode) {
    if (!node.children) return;
    node.children = node.children.filter((child) => {
      if (
        [
          'html',
          'image',
          'imageReference',
          'definition',
          'linkReference',
        ].includes(child.type)
      )
        return false;
      if (child.url) {
        try {
          canonicalUrl(child.url);
        } catch {
          return false;
        }
      }
      clean(child);
      return true;
    });
  }
  clean(root);
  return processor.stringify(root);
}
export async function renderHtml(markdown: string): Promise<string> {
  return String(
    await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .process(sanitizeMarkdown(markdown)),
  );
}
