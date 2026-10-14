import { service, checked } from '../_shared/http.ts';
import { contentSchema } from '../../../src/domain/schema.ts';

Deno.serve(async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  };

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET')
    return new Response(JSON.stringify({ error: 'GET required' }), { status: 405, headers });
  try {
    const content = contentSchema.parse(checked(await service().rpc('portfolio_live_content')));

    if (content.entities.some((e) => e.status !== 'published'))
      throw new Error('Invalid public version');

    return new Response(JSON.stringify(content), {
      headers: { ...headers, ETag: `"${content.releaseId}"` },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Published content is unavailable.' }), {
      status: 503,
      headers,
    });
  }
});
