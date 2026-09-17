export class PipelineError extends Error {
  constructor(
    public readonly category: string,
    message: string,
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}
export class QuotaExhaustedError extends PipelineError {
  constructor() {
    super(
      'quota_exhausted',
      'Gemini quota exhausted; no article was published.',
    );
  }
}
