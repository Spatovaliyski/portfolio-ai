import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { supabaseCli as cli } from './supabase-cli.ts';

const project = 'lmxukzcvxhpbwtgsbrai';

if ((await readFile('supabase/.temp/project-ref', 'utf8')).trim() !== project)
  throw new Error('Wrong linked project. Owner setup is restricted to Portfolio.');
// Capture privileged credentials only in process memory. Never log the CLI result.
const keys = JSON.parse(
  cli(['projects', 'api-keys', '--project-ref', project, '--reveal', '--output', 'json']),
) as Array<{ name: string; type?: string; api_key: string }>;
const secret =
  keys.find((key) => key.name === 'service_role') ?? keys.find((key) => key.type === 'secret');

if (!secret?.api_key) throw new Error('Privileged project key unavailable');
const client = createClient(`https://${project}.supabase.co`, secret.api_key, {
  auth: { persistSession: false },
});
const { data, error } = await client.auth.admin.listUsers();

if (error) throw new Error('Owner audit failed');
const email = 'martinspatovaliyski@gmail.com';
let user = data.users.find((user) => user.email?.toLowerCase() === email);

if (data.users.some((other) => other.id !== user?.id))
  throw new Error('Unexpected accounts require a trusted review before owner provisioning.');
if (!user) {
  const created = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomBytes(48).toString('base64url'),
  });

  if (created.error || !created.data.user) throw new Error('Owner account provisioning failed');
  user = created.data.user;
}
if (!/^[a-f0-9-]{36}$/.test(user.id)) throw new Error('Invalid owner UUID');
await mkdir('.cache', { recursive: true });
await writeFile(
  '.cache/owner-setup.sql',
  `do $$ begin if exists(select 1 from portfolio_private.owner where user_id <> '${user.id}') then raise exception 'Different owner already configured'; end if; insert into portfolio_private.owner(user_id) values('${user.id}') on conflict(singleton) do nothing; end $$;`,
);
cli(['db', 'query', '--linked', '--file', '.cache/owner-setup.sql']);
console.log(
  `Owner provisioned: ${email} (${user.id}). No email sent. Use Recover access in the editor to set your password, then enroll TOTP. Content stays locked until MFA succeeds.`,
);
