import { mkdir, writeFile } from 'node:fs/promises';
import { seedContent } from '../src/content/seed.ts';
import { supabaseCli } from './supabase-cli.ts';

const quote = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const statements = ['do $$ begin'];

for (const entity of seedContent.entities) {
  statements.push(
    `if not extensions.jsonb_matches_schema((select json_schema::json from portfolio_private.entity_schemas where kind='${entity.kind}'),${quote(entity.data)}) then raise exception 'Schema rejected valid ${entity.id}'; end if;`,
  );
}
const project = structuredClone(seedContent.entities.find((e) => e.id === 'bausy')!.data);

project.css = 'body{display:none}';
statements.push(
  `if extensions.jsonb_matches_schema((select json_schema::json from portfolio_private.entity_schemas where kind='project'),${quote(project)}) then raise exception 'Schema accepted arbitrary CSS'; end if;`,
);
delete project.css;
project.blocks = [{ id: 'unsafe', type: 'executable', script: 'attack()' }];
statements.push(
  `if extensions.jsonb_matches_schema((select json_schema::json from portfolio_private.entity_schemas where kind='project'),${quote(project)}) then raise exception 'Schema accepted executable block'; end if;`,
  'end $$;',
);
await mkdir('.cache', { recursive: true });
await writeFile('.cache/native-schema-proof.sql', statements.join('\n'));
// Only synthetic public fixtures. No content rows, auth identities or storage writes.
supabaseCli([
  'db',
  'query',
  process.argv.includes('--linked') ? '--linked' : '--local',
  '--file',
  '.cache/native-schema-proof.sql',
]);
console.log(
  'Native JSON schemas accept the public fixtures and reject unsafe structures. No project data was changed.',
);
