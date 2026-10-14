// stdout is piped into the VPS environment by the deployment workflow. These are public project credentials.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (url !== 'https://lmxukzcvxhpbwtgsbrai.supabase.co' || !key || /[\r\n"'\\]/.test(key))
  throw new Error('Configure the production Supabase URL and publishable key variables.');
process.stdout.write(
  `SUPABASE_URL=${url}\nSUPABASE_PUBLISHABLE_KEY=${key}\nPORT=4173\nNODE_ENV=production\n`,
);

export {};
