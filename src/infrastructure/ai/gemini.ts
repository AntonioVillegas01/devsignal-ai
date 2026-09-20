import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { Config } from '../../config';
import { BoundedLlm, type LlmTransport } from './bounded';
export type GeminiTransport = LlmTransport;
export class SdkGeminiTransport implements GeminiTransport {
  private client: GoogleGenAI;
  constructor(apiKey: string) {
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 60000, retryOptions: { attempts: 1 } },
    });
  }
  async generate(request: Parameters<GeminiTransport['generate']>[0]) {
    const response = await this.client.models.generateContent({
      model: request.model,
      contents: request.contents,
      config: {
        systemInstruction: request.system,
        responseMimeType: 'application/json',
        responseJsonSchema: request.schema,
        maxOutputTokens: request.maxOutputTokens,
        temperature: 0.2,
        thinkingConfig: request.model.startsWith('gemini-2.5-')
          ? { thinkingBudget: 0 }
          : { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });
    return {
      text: response.text,
      tokens: response.usageMetadata?.totalTokenCount,
    };
  }
}
export class GeminiLlm extends BoundedLlm {
  constructor(config: Config, transport?: GeminiTransport) {
    super(
      config,
      {
        key: config.GEMINI_API_KEY,
        model: config.GEMINI_MODEL,
        name: 'Gemini',
        keyName: 'GEMINI_API_KEY',
        create: () => new SdkGeminiTransport(config.GEMINI_API_KEY),
      },
      transport,
    );
  }
}
