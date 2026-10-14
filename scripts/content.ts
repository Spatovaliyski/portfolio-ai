import { ContentStore } from '../src/server/store.ts';
import './machine.ts';

export async function loadContent() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error('Configure the Supabase URL and publishable key.');

  return new ContentStore(url, key).live();
}
