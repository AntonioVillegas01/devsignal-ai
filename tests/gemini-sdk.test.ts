import { beforeEach, describe, expect, it, vi } from 'vitest';
const { generateContent, construct } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  construct: vi.fn(),
}));
vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class {
    models = { generateContent };
    constructor(options: unknown) {
      construct(options);
    }
  },
}));
import { SdkGeminiTransport, GeminiLlm } from '../src/infrastructure/ai/gemini';
import { loadConfig } from '../src/config';
import { draftSchema } from '../src/domain/entities/models';
describe('Gemini SDK compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateContent.mockResolvedValue({
      text: '{}',
      usageMetadata: { totalTokenCount: 12 },
    });
  });
  it.each(['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])(
    'uses supported thinking controls for %s and never retries automatically',
    async (model) => {
      const transport = new SdkGeminiTransport('fake-key');
      await transport.generate({
        model,
        system: 'Review the evidence',
        contents: '{}',
        schema: { type: 'object' },
        maxOutputTokens: 6000,
      });
      expect(construct).toHaveBeenCalledWith({
        apiKey: 'fake-key',
        httpOptions: { timeout: 60000, retryOptions: { attempts: 1 } },
      });
      expect(generateContent).toHaveBeenCalledExactlyOnceWith({
        model,
        contents: '{}',
        config: {
          systemInstruction: 'Review the evidence',
          responseMimeType: 'application/json',
          responseJsonSchema: { type: 'object' },
          maxOutputTokens: 6000,
          temperature: 0.2,
          thinkingConfig: model.startsWith('gemini-2.5-')
            ? { thinkingBudget: 0 }
            : { thinkingLevel: 'MINIMAL' },
        },
      });
    },
  );
  it('reports model retirement without exposing the provider error or switching models', async () => {
    generateContent.mockRejectedValue({
      status: 404,
      message: 'provider detail with fake-key',
    });
    const llm = new GeminiLlm(loadConfig({ GEMINI_API_KEY: 'fake-key' }));
    await expect(
      llm.generate({
        role: 'researcher',
        instruction: 'Write from evidence',
        data: {},
        schema: draftSchema,
      }),
    ).rejects.toMatchObject({
      category: 'model_unavailable',
      message: expect.not.stringContaining('fake-key'),
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(llm.usage().calls).toBe(1);
  });
});
