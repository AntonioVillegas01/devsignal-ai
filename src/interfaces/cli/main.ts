import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { createContainer } from '../../container';
import { atomicJson } from '../../infrastructure/repositories/files';
import {
  draftSchema,
  reviewSchema,
  sourceSchema,
  validationSchema,
} from '../../domain/entities/models';
import { PipelineError } from '../../domain/errors/pipeline-error';
import { FindSimilarTopicsQuery } from '../../application/queries';
const checkpointSchema = z.object({
  collectedAt: z.iso.datetime(),
  sources: z.array(sourceSchema),
  draft: draftSchema.optional(),
  review: reviewSchema.optional(),
  validation: validationSchema.optional(),
  llmCalls: z.number().int().nonnegative().default(0),
  estimatedTokens: z.number().int().nonnegative().default(0),
});
const args = process.argv.slice(2),
  stage = args[0] ?? 'run';
const dryRun = args.includes('--dry-run'),
  fixture = args.includes('--fixture');
const stages = [
  'run',
  'collect',
  'rank',
  'generate',
  'review',
  'validate',
  'publish',
];
const root = process.cwd(),
  cache = join(root, '.cache'),
  checkpointPath = join(cache, 'checkpoint.json'),
  lock = join(cache, 'pipeline.lock');
async function main() {
  if (
    !stages.includes(stage) ||
    args.slice(1).some((v) => !['--dry-run', '--fixture'].includes(v))
  )
    throw new Error(
      'Usage: npm run stage -- <run|collect|rank|generate|review|validate|publish> [--dry-run] [--fixture]',
    );
  if (fixture && (stage !== 'run' || !dryRun))
    throw new Error(
      'Fixtures are only available with run --dry-run --fixture; test content can never be published.',
    );
  const overrides: Parameters<typeof createContainer>[1] = {};
  if (fixture) {
    const { FakeLlm, FakeSources } =
      await import('../../../tests/fixtures/fakes');
    const { fixtureNow } = await import('../../../tests/fixtures/data');
    overrides.llm = new FakeLlm();
    overrides.sources = new FakeSources();
    overrides.clock = { now: () => new Date(fixtureNow) };
  }
  const container = createContainer(root, overrides);
  let locked = false;
  try {
    if (!dryRun) {
      await mkdir(cache, { recursive: true });
      try {
        await mkdir(lock);
        locked = true;
      } catch {
        throw new Error(
          'Another pipeline holds .cache/pipeline.lock. Remove it only if the previous process has stopped.',
        );
      }
    }
    if (stage === 'run') {
      const metrics = await container.run.execute(dryRun);
      console.log(JSON.stringify(metrics, null, 2));
      if (metrics.publicationResult === 'failed') process.exitCode = 1;
      return;
    }
    if (stage === 'collect') {
      const sources = await container.collect.execute();
      const checkpoint = checkpointSchema.parse({
        collectedAt: container.clock.now().toISOString(),
        sources,
      });
      if (!dryRun) await atomicJson(checkpointPath, checkpoint);
      console.log(
        JSON.stringify({ stage, sourcesCollected: sources.length, dryRun }),
      );
      return;
    }
    const checkpoint = checkpointSchema.parse(
      JSON.parse(await readFile(checkpointPath, 'utf8')),
    );
    if (Math.abs(Date.now() - Date.parse(checkpoint.collectedAt)) > 86400000)
      throw new Error('Checkpoint is older than 24 hours. Run collect again.');
    // Share the call budget across separate CLI stage invocations in this checkpoint.
    const originalGenerate = container.llm.generate.bind(container.llm);
    const maxCalls = Number(process.env.MAX_LLM_CALLS ?? 4);
    container.llm.generate = (request) => {
      if (checkpoint.llmCalls + container.llm.usage().calls >= maxCalls)
        throw new PipelineError(
          'call_budget',
          'Checkpoint LLM call budget reached. Collect again to start a new run.',
        );
      return originalGenerate(request);
    };
    try {
      const candidates = container.rank.execute(checkpoint.sources);
      if (stage === 'rank') {
        console.log(
          JSON.stringify(
            candidates.map(({ title, score, rationale }) => ({
              title,
              score,
              rationale,
            })),
            null,
            2,
          ),
        );
        return;
      }
      if (stage === 'generate') {
        const similar = new FindSimilarTopicsQuery(
          container.articles,
          container.policy.duplicateThreshold,
        );
        const topic = candidates.find(
          (candidate) => candidate.sources.length >= 2,
        );
        if (!topic || (await similar.execute(topic.title)).length)
          throw new PipelineError(
            'no_suitable_topic',
            'No suitable new topic.',
          );
        checkpoint.draft = await container.generate.execute(topic);
        checkpoint.sources = topic.sources;
        delete checkpoint.review;
        delete checkpoint.validation;
      } else {
        if (!checkpoint.draft) throw new Error('Run the generate stage first.');
        if (stage === 'review') {
          checkpoint.review = await container.review.execute(
            checkpoint.draft,
            checkpoint.sources,
          );
          delete checkpoint.validation;
        } else {
          if (!checkpoint.review)
            throw new Error('Run the review stage first.');
          checkpoint.validation =
            stage === 'validate'
              ? await container.validate.execute(
                  checkpoint.draft,
                  checkpoint.review,
                  checkpoint.sources,
                )
              : await container.publish.execute(
                  checkpoint.draft,
                  checkpoint.review,
                  checkpoint.sources,
                  dryRun,
                );
          if (!checkpoint.validation.passed)
            console.log(
              JSON.stringify({ failures: checkpoint.validation.failures }),
            );
        }
      }
      console.log(
        JSON.stringify({
          stage,
          dryRun,
          slug: checkpoint.draft?.slug,
          review: checkpoint.review?.overall,
          validation: checkpoint.validation,
        }),
      );
    } finally {
      const usage = container.llm.usage();
      checkpoint.llmCalls += usage.calls;
      checkpoint.estimatedTokens += usage.estimatedTokens;
      if (!dryRun && stage !== 'rank')
        await atomicJson(checkpointPath, checkpoint);
    }
  } finally {
    if (locked) await rm(lock, { recursive: true });
  }
}
main().catch((error: unknown) => {
  const expected =
    error instanceof PipelineError &&
    [
      'quota_exhausted',
      'call_budget',
      'no_suitable_topic',
      'daily_limit',
    ].includes(error.category);
  const message =
    error instanceof PipelineError
      ? error.message
      : error instanceof Error && !/api.?key|AIza/i.test(error.message)
        ? error.message.slice(0, 240)
        : 'Pipeline failed. Check configuration and run npm run check.';
  console.error(
    JSON.stringify({ result: expected ? 'skipped' : 'failed', message }),
  );
  process.exitCode = expected ? 0 : 1;
});
