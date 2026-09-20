import { z } from 'zod';
import type { Policy } from '../application/dto/policy';
import { trustedDomains } from './sources';
const integer = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);
export const configSchema = z
  .object({
    LLM_PROVIDER: z.enum(['gemini', 'claude']).default('gemini'),
    ANTHROPIC_API_KEY: z.string().default(''),
    CLAUDE_MODEL: z
      .string()
      .regex(/^claude-[a-zA-Z0-9.-]+$/)
      .default('claude-sonnet-4-5'),
    GEMINI_API_KEY: z.string().default(''),
    GEMINI_MODEL: z
      .enum(['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])
      .default('gemini-3.6-flash'),
    FREE_TIER_ONLY: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    MAX_LLM_CALLS: integer(4, 1, 4),
    MAX_OUTPUT_TOKENS: integer(6000, 1000, 8000),
    MAX_INPUT_CHARS: integer(60000, 5000, 100000),
    MAX_ARTICLES_PER_DAY: integer(1, 1, 3),
    SOURCE_LOOKBACK_DAYS: integer(14, 1, 30),
    MIN_REVIEW_SCORE: integer(85, 85, 100),
    MIN_CATEGORY_SCORE: integer(80, 80, 100),
    DUPLICATE_THRESHOLD: z.coerce.number().min(0.3).max(0.8).default(0.65),
  })
  .refine(
    (c) => (c.LLM_PROVIDER === 'claude' ? !c.FREE_TIER_ONLY : c.FREE_TIER_ONLY),
    {
      message: 'Claude requires FREE_TIER_ONLY=false; Gemini requires true',
      path: ['FREE_TIER_ONLY'],
    },
  );
export type Config = z.infer<typeof configSchema>;
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  const result = configSchema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Invalid configuration: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}. Check .env.example.`,
    );
  return result.data;
}
export function toPolicy(config: Config): Policy {
  return {
    lookbackDays: config.SOURCE_LOOKBACK_DAYS,
    duplicateThreshold: config.DUPLICATE_THRESHOLD,
    minReviewScore: config.MIN_REVIEW_SCORE,
    minCategoryScore: config.MIN_CATEGORY_SCORE,
    maxArticlesPerDay: config.MAX_ARTICLES_PER_DAY,
    trustedDomains,
  };
}
