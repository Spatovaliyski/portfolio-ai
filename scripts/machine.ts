try {
  process.loadEnvFile('.env.local');
} catch {
  /* CI provides environment variables */
}

export const supabaseUrl =
  process.env.VITE_SUPABASE_URL ?? 'https://lmxukzcvxhpbwtgsbrai.supabase.co';

export async function machine<T>(body: Record<string, unknown>): Promise<T> {
  const token = process.env.PORTFOLIO_MACHINE_TOKEN;

  if (!token) throw new Error('Set PORTFOLIO_MACHINE_TOKEN in protected CI secrets.');
  const response = await fetch(`${supabaseUrl}/functions/v1/automation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-machine-token': token,
      ...(process.env.VITE_SUPABASE_PUBLISHABLE_KEY
        ? { apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) throw new Error(data.error ?? `Machine endpoint failed (${response.status})`);

  return data;
}
