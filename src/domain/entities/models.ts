import { z } from 'zod';

export const categorySchema = z.enum([
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
  'AI engineering',
]);
export type Category = z.infer<typeof categorySchema>;
export const slugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const sourceSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(5).max(300),
    url: z.url(),
    publishedAt: z.iso.datetime(),
    content: z.string().min(80).max(12000),
    category: categorySchema,
    kind: z.enum(['update', 'reference']),
  })
  .strict();
export type Source = z.infer<typeof sourceSchema>;
export interface Topic {
  title: string;
  category: Category;
  sources: Source[];
  score: number;
  rationale: string;
}
const section = z.string().min(100).max(6000);
export const draftSchema = z
  .object({
    slug: slugSchema,
    title: z.string().min(15).max(140),
    category: categorySchema,
    summary: z.string().min(100).max(700),
    whatChanged: section,
    whyItMatters: section,
    explanation: z.string().min(250).max(8000),
    typescript: z.string().min(80).max(10000),
    considerations: section,
    tradeOffs: section,
    whenToUse: section,
    whenNotToUse: section,
    limitations: section,
    sources: z.array(z.url()).min(2).max(6),
  })
  .strict();
export type Draft = z.infer<typeof draftSchema>;
export const scoreSchema = z
  .object({
    factualGrounding: z.number().int().min(0).max(100),
    technicalDepth: z.number().int().min(0).max(100),
    clarity: z.number().int().min(0).max(100),
    usefulness: z.number().int().min(0).max(100),
    sourceQuality: z.number().int().min(0).max(100),
    originality: z.number().int().min(0).max(100),
  })
  .strict();
export const reviewSchema = z
  .object({
    scores: scoreSchema,
    overall: z.number().int().min(0).max(100),
    unsupportedClaims: z.array(z.string().min(1)).max(30),
    inventedSources: z.array(z.string().min(1)).max(20),
    feedback: z.array(z.string().min(1)).max(30),
    approved: z.boolean(),
  })
  .strict();
export type Review = z.infer<typeof reviewSchema>;
export const validationSchema = z
  .object({
    passed: z.boolean(),
    failures: z.array(z.string()),
    checkedAt: z.iso.datetime(),
  })
  .strict();
export type Validation = z.infer<typeof validationSchema>;
export const articleSchema = z
  .object({
    draft: draftSchema,
    review: reviewSchema,
    validation: validationSchema.extend({
      passed: z.literal(true),
      failures: z.array(z.string()).max(0),
    }),
    publishedAt: z.iso.datetime(),
    sourceSnapshot: z.array(sourceSchema).min(2),
  })
  .strict();
export type Article = z.infer<typeof articleSchema>;
export const metricSchema = z
  .object({
    startedAt: z.iso.datetime(),
    finishedAt: z.iso.datetime(),
    sourcesCollected: z.number().int().nonnegative(),
    candidatesEvaluated: z.number().int().nonnegative(),
    llmCalls: z.number().int().nonnegative(),
    estimatedTokens: z.number().int().nonnegative(),
    selectedTopic: z.string().nullable(),
    reviewScores: z.array(z.number()),
    validationFailures: z.array(z.string()),
    publicationResult: z.enum([
      'published',
      'dry-run',
      'skipped',
      'rejected',
      'failed',
    ]),
    failureCategory: z.string().nullable(),
  })
  .strict();
export type Metrics = z.infer<typeof metricSchema>;
export const stateSchema = z
  .object({ version: z.literal(1), runs: z.array(metricSchema).max(90) })
  .strict();
export type PipelineState = z.infer<typeof stateSchema>;
