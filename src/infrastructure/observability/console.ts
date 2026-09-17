import type { ClockPort, TelemetryPort } from '../../application/ports';
export class SystemClock implements ClockPort {
  now() {
    return new Date();
  }
}
export class ConsoleTelemetry implements TelemetryPort {
  event(
    name: string,
    fields: Record<string, string | number | boolean | null> = {},
  ) {
    const allowed = new Set([
      'result',
      'failureCategory',
      'llmCalls',
      'source',
      'script',
      'passed',
    ]);
    const safe = Object.fromEntries(
      Object.entries(fields).filter(([key]) => allowed.has(key)),
    );
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: name,
        ...safe,
      }),
    );
  }
}
