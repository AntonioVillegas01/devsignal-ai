import type { Category } from '../domain/entities/models';
export const trustedDomains = [
  'react.dev',
  'nextjs.org',
  'www.typescriptlang.org',
  'devblogs.microsoft.com',
  'nodejs.org',
  'ai.google.dev',
  'github.com',
  'api.github.com',
] as const;
export interface SourceDefinition {
  name: string;
  category: Category;
  url: string;
  type: 'rss' | 'github' | 'reference';
}
export const sourceDefinitions: SourceDefinition[] = [
  {
    name: 'React releases',
    category: 'React',
    type: 'github',
    url: 'https://api.github.com/repos/facebook/react/releases?per_page=8',
  },
  {
    name: 'React documentation',
    category: 'React',
    type: 'reference',
    url: 'https://react.dev/reference/react',
  },
  {
    name: 'Next.js releases',
    category: 'Next.js',
    type: 'github',
    url: 'https://api.github.com/repos/vercel/next.js/releases?per_page=8',
  },
  {
    name: 'Next.js App Router',
    category: 'Next.js',
    type: 'reference',
    url: 'https://nextjs.org/docs/app',
  },
  {
    name: 'TypeScript blog',
    category: 'TypeScript',
    type: 'rss',
    url: 'https://devblogs.microsoft.com/typescript/feed/',
  },
  {
    name: 'TypeScript releases',
    category: 'TypeScript',
    type: 'github',
    url: 'https://api.github.com/repos/microsoft/TypeScript/releases?per_page=8',
  },
  {
    name: 'TypeScript handbook',
    category: 'TypeScript',
    type: 'reference',
    url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
  },
  {
    name: 'Node.js releases',
    category: 'Node.js',
    type: 'github',
    url: 'https://api.github.com/repos/nodejs/node/releases?per_page=8',
  },
  {
    name: 'Node.js documentation',
    category: 'Node.js',
    type: 'reference',
    url: 'https://nodejs.org/api/',
  },
  {
    name: 'Google Gen AI SDK releases',
    category: 'AI engineering',
    type: 'github',
    url: 'https://api.github.com/repos/googleapis/js-genai/releases?per_page=8',
  },
  {
    name: 'Gemini structured output',
    category: 'AI engineering',
    type: 'reference',
    url: 'https://ai.google.dev/gemini-api/docs/structured-output',
  },
];
