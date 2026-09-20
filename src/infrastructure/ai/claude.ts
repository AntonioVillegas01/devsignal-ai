import { z } from 'zod';
import type { Config } from '../../config';
import { PipelineError } from '../../domain/errors/pipeline-error';
import { BoundedLlm, type LlmTransport } from './bounded';
const responseSchema = z.object({
  stop_reason: z.string(),
  content: z.array(
    z.object({
      type: z.string(),
      name: z.string().optional(),
      input: z.unknown().optional(),
    }),
  ),
  usage: z.object({
    input_tokens: z.number().nonnegative(),
    output_tokens: z.number().nonnegative(),
  }),
});
export class ClaudeTransport implements LlmTransport {
  constructor(
    private apiKey: string,
    private fetcher: typeof fetch = fetch,
  ) {}
  async generate(request: Parameters<LlmTransport['generate']>[0]) {
    const response = await this.fetcher(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(60000),
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxOutputTokens,
          temperature: 0.2,
          system: request.system,
          messages: [{ role: 'user', content: request.contents }],
          tools: [
            {
              name: 'submit_result',
              description:
                'Return the structured result for validation. This does not execute any action.',
              input_schema: request.schema,
            },
          ],
          tool_choice: {
            type: 'tool',
            name: 'submit_result',
            disable_parallel_tool_use: true,
          },
        }),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw { status: response.status };
    }
    const result = responseSchema.parse(await response.json());
    const outputs = result.content.filter(
      (block) => block.type === 'tool_use' && block.name === 'submit_result',
    );
    if (result.stop_reason !== 'tool_use' || outputs.length !== 1)
      throw new PipelineError(
        'invalid_output',
        'Claude did not return one complete structured result.',
      );
    return {
      text: JSON.stringify(outputs[0]!.input),
      tokens: result.usage.input_tokens + result.usage.output_tokens,
    };
  }
}
export class ClaudeLlm extends BoundedLlm {
  constructor(config: Config, transport?: LlmTransport) {
    super(
      config,
      {
        key: config.ANTHROPIC_API_KEY,
        model: config.CLAUDE_MODEL,
        name: 'Claude',
        keyName: 'ANTHROPIC_API_KEY',
        create: () => new ClaudeTransport(config.ANTHROPIC_API_KEY),
      },
      transport,
    );
  }
}
