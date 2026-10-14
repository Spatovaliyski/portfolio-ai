import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? 'https://lmxukzcvxhpbwtgsbrai.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'not-configured',
);

export async function editorRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch('/api/admin/' + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + (data.session?.access_token ?? ''), ...init.headers },
  });
  const result = await response.json();

  if (!response.ok) throw new Error(result.error ?? 'Unable to save. Try again.');

  return result as T;
}
