import { vi } from 'vitest';
// No test should ever use a developer's live key or the default network transport.
vi.stubEnv('GEMINI_API_KEY', '');
vi.stubGlobal('fetch', () => {
  throw new Error('Network is disabled in tests; inject a fake transport.');
});
