import { z } from 'zod';
import type { Policy } from '../application/dto/policy';
import { trustedDomains } from './sources';
const integer = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);
export const configSchema = z
  .object({
    GEMINI_API_KEY: z.string().default(''),
    GEMINI_MODEL: z
      .enum(['gemini-2.5-flash', 'gemini-2.5-flash-lite'])
      .default('gemini-2.5-flash'),
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
  .refine((c) => c.FREE_TIER_ONLY, {
    message: 'Free Tier mode is required',
    path: ['FREE_TIER_ONLY'],
  });
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
