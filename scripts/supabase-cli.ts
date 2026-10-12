import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';

/** Privileged CLI output stays in memory; failure must never echo captured keys. */
export function supabaseCli(args: string[]): string {
  try {
    const options = {
      encoding: 'utf8' as const,
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
    };

    return process.platform === 'win32'
      ? execFileSync(
          process.execPath,
          [
            process.env.PORTFOLIO_SUPABASE_CLI ??
              join(dirname(process.execPath), 'node_modules/supabase/dist/supabase.js'),
            ...args,
          ],
          options,
        )
      : execFileSync('supabase', args, options);
  } catch {
    throw new Error('Trusted Supabase command failed. No credentials were logged.');
  }
}
