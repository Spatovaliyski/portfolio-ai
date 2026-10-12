import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { seedContent } from '../src/content/seed.ts';
import { entitySchema } from '../src/domain/schema.ts';
import './machine.ts';

if (!process.env.PORTFOLIO_OWNER_ACCESS_TOKEN)
  throw new Error('A verified owner MFA session is required.');
const client = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
  {
    global: { headers: { Authorization: `Bearer ${process.env.PORTFOLIO_OWNER_ACCESS_TOKEN}` } },
    auth: { persistSession: false },
  },
);
const { data: rows, error } = await client
  .from('portfolio_entities')
  .select('id,kind,status,sort_order,data,version');

if (error) throw error;
for (const source of seedContent.entities) {
  const entity = structuredClone(source);

  entity.status = 'draft';
  const existing = rows.find((row) => row.id === entity.id);

  if (entity.kind === 'media') {
    if (existing && existing.data.path !== entity.data.path) continue;
    const bytes = await readFile('public/media/' + entity.data.path);
    const original = await client.storage
      .from('portfolio-originals')
      .download(String(entity.data.path));

    if (original.data) {
      if (!bytes.equals(Buffer.from(await original.data.arrayBuffer())))
        throw new Error(`Original collision: ${entity.id}`);
    } else {
      const { error } = await client.storage
        .from('portfolio-originals')
        .upload(String(entity.data.path), bytes, {
          contentType: String(entity.data.mime),
          upsert: false,
        });

      if (error) throw error;
    }
    const metadata = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();

    if (existing) {
      entity.data = { ...existing.data };
      entity.status = existing.status;
      entity.sortOrder = existing.sort_order;
    }
    entity.data.bytes = bytes.byteLength;
    entity.data.width = metadata.width;
    entity.data.height = metadata.height;
    delete entity.data.publicPath;
    delete entity.data.variants;
    if (existing && JSON.stringify(entity.data) === JSON.stringify(existing.data)) continue;
  } else if (existing) continue;
  const { error } = await client.functions.invoke('content', {
    body: {
      action: 'save',
      entity: entitySchema.parse(entity),
      expectedVersion: existing?.version ?? 0,
    },
  });

  if (error) throw error;
}
console.log(
  'Starter content and immutable original media imported as private drafts. Existing authored content was preserved.',
);
