import type { Config } from '../../config';
import { GeminiLlm } from './gemini';
import { ClaudeLlm } from './claude';
export function createLlm(config: Config) {
  return config.LLM_PROVIDER === 'claude'
    ? new ClaudeLlm(config)
    : new GeminiLlm(config);
}
