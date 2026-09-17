import {
  mkdir,
  readFile,
  readdir,
  lstat,
  writeFile,
  rename,
  unlink,
  link,
} from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import matter from 'gray-matter';
import {
  articleSchema,
  slugSchema,
  stateSchema,
  type Article,
  type PipelineState,
} from '../../domain/entities/models';
import type {
  ArticleRepositoryPort,
  PipelineStateRepositoryPort,
} from '../../application/ports';
import { ArticleMarkdown } from '../publishing/markdown';
async function ensureDirectory(directory: string) {
  await mkdir(directory, { recursive: true });
  if ((await lstat(directory)).isSymbolicLink())
    throw new Error('Repository directories must not be symlinks');
}
async function assertDirectory(directory: string): Promise<boolean> {
  try {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error('Unsafe repository directory');
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
async function regularFile(path: string) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1000000)
    throw new Error('Unsafe repository file');
}
export async function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
export class MarkdownArticleRepository implements ArticleRepositoryPort {
  private directory: string;
  private parent: string;
  constructor(root: string) {
    this.parent = join(root, 'content');
    this.directory = join(this.parent, 'articles');
  }
  async list(): Promise<Article[]> {
    if (
      !(await assertDirectory(this.parent)) ||
      !(await assertDirectory(this.directory))
    )
      return [];
    let files: string[];
    try {
      files = await readdir(this.directory);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
    const articles = await Promise.all(
      files
        .filter((f) => f.endsWith('.md'))
        .map((f) => this.get(f.slice(0, -3))),
    );
    return articles
      .filter((a): a is Article => a !== null)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  async get(slug: string): Promise<Article | null> {
    slugSchema.parse(slug);
    if (
      !(await assertDirectory(this.parent)) ||
      !(await assertDirectory(this.directory))
    )
      return null;
    const path = join(this.directory, `${slug}.md`);
    try {
      await regularFile(path);
      const raw = await readFile(path, 'utf8');
      // gray-matter supports executable JavaScript engines; only plain YAML is accepted.
      if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n'))
        throw new Error('Only plain YAML frontmatter is allowed');
      const parsed = matter(raw, {
        language: 'yaml',
        engines: {
          javascript: {
            parse() {
              throw new Error('Executable frontmatter is forbidden');
            },
            stringify() {
              throw new Error('Executable frontmatter is forbidden');
            },
          },
        },
      });
      const article = articleSchema.parse(parsed.data);
      if (
        article.draft.slug !== slug ||
        parsed.content.trim() !==
          new ArticleMarkdown().render(article.draft).trim()
      )
        throw new Error('Article content does not match validated frontmatter');
      return article;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  async save(value: Article): Promise<void> {
    const article = articleSchema.parse(value);
    await ensureDirectory(this.parent);
    await ensureDirectory(this.directory);
    const path = join(this.directory, `${article.draft.slug}.md`);
    const temporary = join(this.directory, `.${randomUUID()}.tmp`);
    try {
      await writeFile(
        temporary,
        matter.stringify(new ArticleMarkdown().render(article.draft), article),
        { flag: 'wx' },
      );
      // Hard link atomically creates a new name and never overwrites an existing article.
      await link(temporary, path);
    } finally {
      await unlink(temporary).catch(() => {});
    }
  }
}
export class JsonPipelineStateRepository implements PipelineStateRepositoryPort {
  private directory: string;
  private path: string;
  constructor(root: string) {
    this.directory = join(root, 'data');
    this.path = join(this.directory, 'pipeline-state.json');
  }
  async read(): Promise<PipelineState> {
    try {
      if (!(await assertDirectory(this.directory)))
        return { version: 1, runs: [] };
      await regularFile(this.path);
      return stateSchema.parse(JSON.parse(await readFile(this.path, 'utf8')));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT')
        return { version: 1, runs: [] };
      throw e;
    }
  }
  async save(state: PipelineState) {
    await ensureDirectory(this.directory);
    await atomicJson(this.path, stateSchema.parse(state));
  }
}
