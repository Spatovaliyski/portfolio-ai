import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? 'https://lmxukzcvxhpbwtgsbrai.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'not-configured',
);

export async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let detail = error.message;

    if (error.context instanceof Response) {
      try {
        detail = (await error.context.json()).error ?? detail;
      } catch {
        /* retain provider message */
      }
    }
    throw new Error(detail);
  }

  return data as T;
}
