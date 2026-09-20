import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { loadConfig } from '../src/config';
import { ClaudeLlm, ClaudeTransport } from '../src/infrastructure/ai/claude';
import { GeminiLlm } from '../src/infrastructure/ai/gemini';
import { createLlm } from '../src/infrastructure/ai/provider';
const config = () =>
  loadConfig({
    LLM_PROVIDER: 'claude',
    FREE_TIER_ONLY: 'false',
    ANTHROPIC_API_KEY: 'test-key',
  });
const request = {
  role: 'researcher' as const,
  instruction: 'Use the evidence',
  data: {},
  schema: z.object({ ok: z.boolean() }),
};
const reply = {
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', name: 'submit_result', input: { ok: true } }],
  usage: { input_tokens: 10, output_tokens: 5 },
};
describe('configurable LLM provider', () => {
  it('defaults to Gemini and selects Claude only explicitly', () => {
    expect(createLlm(loadConfig({}))).toBeInstanceOf(GeminiLlm);
    expect(createLlm(config())).toBeInstanceOf(ClaudeLlm);
    expect(() => loadConfig({ LLM_PROVIDER: 'claude' })).toThrow();
    expect(() => loadConfig({ LLM_PROVIDER: 'other' })).toThrow();
    expect(() => loadConfig({ FREE_TIER_ONLY: 'false' })).toThrow();
  });
  it('requires the selected provider key even when a Gemini key exists', async () => {
    const generate = vi.fn();
    const llm = new ClaudeLlm(
      { ...config(), ANTHROPIC_API_KEY: '', GEMINI_API_KEY: 'other' },
      { generate },
    );
    await expect(llm.generate(request)).rejects.toMatchObject({
      category: 'missing_api_key',
    });
    expect(generate).not.toHaveBeenCalled();
  });
  it('sends the configured model and schema to Anthropic and validates tool input', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(reply)));
    const llm = new ClaudeLlm(
      { ...config(), CLAUDE_MODEL: 'claude-custom-model' },
      new ClaudeTransport('test-key', fetcher),
    );
    expect(await llm.generate(request)).toEqual({ ok: true });
    expect(llm.usage()).toEqual({ calls: 1, estimatedTokens: 15 });
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options?.redirect).toBe('error');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(options?.body));
    expect(body.model).toBe('claude-custom-model');
    expect(body.system).toContain('UNTRUSTED DATA');
    expect(body.tools[0].input_schema.properties.ok.type).toBe('boolean');
    expect(body.tool_choice).toEqual({
      type: 'tool',
      name: 'submit_result',
      disable_parallel_tool_use: true,
    });
    expect(body.max_tokens).toBe(6000);
  });
  it.each([429, 401, 404, 503])(
    'does not retry or leak errors for status %s',
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('test-key', { status }));
      const llm = new ClaudeLlm(
        config(),
        new ClaudeTransport('test-key', fetcher),
      );
      await expect(llm.generate(request)).rejects.toMatchObject({
        category:
          status === 429
            ? 'quota_exhausted'
            : status === 404
              ? 'model_unavailable'
              : 'llm_unavailable',
        message: expect.not.stringContaining('test-key'),
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    { ...reply, stop_reason: 'max_tokens' },
    { ...reply, content: [] },
    { ...reply, content: [...reply.content, ...reply.content] },
    {
      ...reply,
      content: [
        { type: 'tool_use', name: 'submit_result', input: { ok: 'wrong' } },
      ],
    },
  ])(
    'rejects incomplete, missing, multiple or invalid results',
    async (response) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify(response)));
      await expect(
        new ClaudeLlm(
          config(),
          new ClaudeTransport('test-key', fetcher),
        ).generate(request),
      ).rejects.toMatchObject({ category: 'invalid_output' });
    },
  );
  it('shares bounded calls and rejects oversized input before transport', async () => {
    const generate = vi.fn().mockResolvedValue({ text: '{"ok":true}' });
    const llm = new ClaudeLlm({ ...config(), MAX_LLM_CALLS: 1 }, { generate });
    await expect(
      llm.generate({ ...request, data: 'x'.repeat(100001) }),
    ).rejects.toMatchObject({ category: 'input_limit' });
    expect(generate).not.toHaveBeenCalled();
    await llm.generate(request);
    await expect(llm.generate(request)).rejects.toMatchObject({
      category: 'call_budget',
    });
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
