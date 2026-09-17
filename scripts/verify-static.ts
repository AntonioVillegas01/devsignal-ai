import { cp, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { MarkdownArticleRepository } from '../src/infrastructure/repositories/files';
import {
  fixtureDraft,
  fixtureNow,
  fixtureReview,
  fixtureSources,
} from '../tests/fixtures/data';
// Test a populated Pages export in an isolated project, never the real archive.
const root = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), 'devsignal-static-'));
try {
  for (const path of [
    'src',
    'tests',
    'public',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'next-env.d.ts',
    'next.config.ts',
  ]) {
    await cp(join(root, path), join(temporary, path), { recursive: true });
  }
  await symlink(
    join(root, 'node_modules'),
    join(temporary, 'node_modules'),
    'dir',
  );
  await new MarkdownArticleRepository(temporary).save({
    draft: fixtureDraft,
    review: fixtureReview,
    sourceSnapshot: fixtureSources,
    publishedAt: fixtureNow,
    validation: { passed: true, failures: [], checkedAt: fixtureNow },
  });
  const success = await new Promise<boolean>((resolve) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_SITE_URL: 'https://example.github.io',
      NEXT_PUBLIC_BASE_PATH: '/devsignal',
    };
    delete env.GEMINI_API_KEY;
    // Webpack supports sharing installed dependencies outside this temporary workspace.
    const child = spawn(
      process.execPath,
      [join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'],
      { cwd: temporary, env, stdio: 'inherit', timeout: 180000 },
    );
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
  assert(success, 'Populated static export must build');
  const page = await readFile(
    join(temporary, 'out/articles', fixtureDraft.slug, 'index.html'),
    'utf8',
  );
  for (const heading of [
    'Executive summary',
    'What changed',
    'Technical explanation',
    'Implementation considerations',
    'Limitations',
    'Validation passed',
  ])
    assert(page.includes(heading), `Missing ${heading}`);
  assert(page.includes('language-typescript'));
  assert(page.includes(fixtureSources[0]!.url));
  assert(page.includes('/devsignal/_next/'));
  assert(page.includes('https://example.github.io/devsignal/articles/'));
  assert(!page.includes('GEMINI_API_KEY'));
  const index = await readFile(join(temporary, 'out/index.html'), 'utf8');
  assert(index.includes(fixtureDraft.title));
  assert(index.includes(`/devsignal/articles/${fixtureDraft.slug}/`));
  const sitemap = await readFile(join(temporary, 'out/sitemap.xml'), 'utf8');
  assert(
    sitemap.includes(
      `https://example.github.io/devsignal/articles/${fixtureDraft.slug}/`,
    ),
  );
  console.log(
    'Populated static export verified: article sections, code, citations, homepage, canonical URLs, and GitHub Pages base path.',
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
