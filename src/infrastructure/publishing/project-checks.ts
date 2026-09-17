import { spawn } from 'node:child_process';
import type { ProjectChecksPort, TelemetryPort } from '../../application/ports';
export class NpmProjectChecks implements ProjectChecksPort {
  constructor(
    private root: string,
    private telemetry: TelemetryPort,
  ) {}
  async run(): Promise<string[]> {
    for (const script of ['typecheck', 'lint', 'test']) {
      const ok = await new Promise<boolean>((resolve) => {
        const env = { ...process.env };
        delete env.GEMINI_API_KEY;
        const child = spawn('npm', ['run', script], {
          cwd: this.root,
          env,
          stdio: 'ignore',
          timeout: 180000,
          shell: false,
        });
        child.on('error', () => resolve(false));
        child.on('close', (code) => resolve(code === 0));
      });
      this.telemetry.event('project_check', { script, passed: ok });
      if (!ok) return [`project_check:${script}`];
    }
    return [];
  }
}
