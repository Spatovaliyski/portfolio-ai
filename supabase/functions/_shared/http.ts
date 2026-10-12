import { createClient } from '@supabase/supabase-js';

export const service = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
const origins = new Set([
  'https://spatovaliyski.com',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
]);

export function headers(request: Request) {
  const origin = request.headers.get('origin') ?? '';

  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'https://spatovaliyski.com',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-machine-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function handler(fn: (request: Request, body: Record<string, unknown>) => Promise<unknown>) {
  Deno.serve(async (request) => {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: headers(request) });
    try {
      const origin = request.headers.get('origin');

      if (origin && !origins.has(origin)) throw new Error('Forbidden origin');
      if (request.method !== 'POST')
        return new Response(JSON.stringify({ error: 'POST required' }), {
          status: 405,
          headers: headers(request),
        });
      const raw = await request.text();

      if (new TextEncoder().encode(raw).length > 6000000) throw new Error('Request too large');
      const body = JSON.parse(raw);

      if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new Error('Invalid request');

      return new Response(JSON.stringify(await fn(request, body)), { headers: headers(request) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      const status = /Owner|Unauthorized|Forbidden/.test(message)
        ? 403
        : /conflict/i.test(message)
          ? 409
          : /rate|locked/i.test(message)
            ? 429
            : 400;

      console.error(JSON.stringify({ event: 'request_failed', status }));

      return new Response(JSON.stringify({ error: message.slice(0, 1200) }), {
        status,
        headers: headers(request),
      });
    }
  });
}

export async function owner(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer /i, '');

  if (!token) throw new Error('Unauthorized');
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) throw new Error('Unauthorized');
  const { data: allowed, error: policyError } = await client.rpc('portfolio_is_owner');

  if (policyError || !allowed) throw new Error('Owner MFA required');
  if (
    !checked(
      await service().rpc('portfolio_rate_limit', {
        p_scope: 'owner:' + data.user.id,
        p_limit: 120,
      }),
    )
  )
    throw new Error('Owner request rate limit reached. Retry next minute.');

  return { client, user: data.user };
}

export async function machine(request: Request) {
  const actual = request.headers.get('x-machine-token') ?? '';
  const expected = Deno.env.get('PORTFOLIO_MACHINE_TOKEN');

  if (!expected || expected.length < 32 || actual.length !== expected.length)
    throw new Error('Unauthorized machine');
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(actual)));
  const b = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)),
  );
  let difference = 0;

  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (difference) throw new Error('Unauthorized machine');
  if (!checked(await service().rpc('portfolio_rate_limit', { p_scope: 'machine', p_limit: 120 })))
    throw new Error('Machine request rate limit reached. Retry next minute.');
}

export function checked<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);

  return result.data;
}

export async function dispatch(releaseId: string, workflow = 'deploy.yml') {
  const token = Deno.env.get('GITHUB_DISPATCH_TOKEN');
  const repository = Deno.env.get('GITHUB_REPOSITORY');

  if (!token || !repository || !/^Spatovaliyski\/[a-zA-Z0-9_.-]+$/i.test(repository))
    throw new Error('Configure GITHUB_REPOSITORY and GITHUB_DISPATCH_TOKEN before deployment.');
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: workflow === 'deploy.yml' ? { release_id: releaseId } : {},
      }),
    },
  );

  if (!response.ok) throw new Error(`GitHub workflow dispatch failed (${response.status}).`);
}
