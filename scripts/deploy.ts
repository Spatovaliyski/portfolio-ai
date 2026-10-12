import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { machine } from './machine.ts';

const id = process.env.PORTFOLIO_RELEASE_ID;
const target = process.env.PORTFOLIO_SSH_TARGET;
const root = process.env.PORTFOLIO_DEPLOY_ROOT ?? '/srv/portfolio';

if (
  !id ||
  !/^[a-f0-9-]{36}$/.test(id) ||
  !target ||
  !/^[a-zA-Z0-9][a-zA-Z0-9_.@-]+$/.test(target) ||
  !/^\/[a-zA-Z0-9/_-]+$/.test(root) ||
  root === '/'
)
  throw new Error('Valid release ID, SSH target and deployment root required.');

async function command(name: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(name, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errors = '';

    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (errors += data));
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`${name} failed (${code}): ${errors.slice(-1000)}`)),
    );
  });
}
const manifest = JSON.parse(await readFile('dist/client/release.json', 'utf8')) as {
  releaseId: string;
  generation: number;
  buildId: string;
};

if (manifest.releaseId !== id || manifest.generation <= 0)
  throw new Error('Artifact does not match requested release');
const options = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes'];
const variant = `${id}-${process.env.GITHUB_RUN_ID ?? 'local'}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}`;

if (!/^[a-zA-Z0-9_-]{1,160}$/.test(variant)) throw new Error('Invalid candidate identity');
await command('ssh', [...options, target, `mkdir -p ${root}/uploads`]);
await command('tar', ['-czf', 'dist/candidate.tgz', '-C', 'dist/client', '.']);
await command('scp', [
  ...options,
  'dist/candidate.tgz',
  `${target}:${root}/uploads/${variant}.tgz`,
]);
await command('scp', [
  ...options,
  'deploy/activate.sh',
  `${target}:${root}/uploads/activate-${id}.sh`,
]);
// Never overwrite an already retained release. A failed upload remains a harmless candidate.
await command('ssh', [
  ...options,
  target,
  `test -d ${root}/releases/${variant} || (mkdir -p ${root}/releases/${variant} && tar -xzf ${root}/uploads/${variant}.tgz -C ${root}/releases/${variant})`,
]);
await machine({ action: 'release', releaseId: id }); // Recheck approval and privacy immediately before activation.
const activated = JSON.parse(
  await command('ssh', [
    ...options,
    target,
    `bash ${root}/uploads/activate-${id}.sh ${root} ${id} ${variant}`,
  ]),
) as typeof manifest;

if (activated.releaseId !== id || activated.generation !== manifest.generation)
  throw new Error('VPS activated manifest mismatch');
await mkdir('dist', { recursive: true });
await writeFile('dist/activated.json', JSON.stringify(activated));
let reported = false;

for (let attempt = 0; attempt < 3; attempt++) {
  try {
    await machine({
      action: 'report',
      releaseId: id,
      buildId: activated.buildId,
      state: 'deployed',
    });
    reported = true;
    break;
  } catch {
    /* Reconciliation reads the authoritative VPS manifest. */
  }
}
if (!reported)
  console.warn(
    'Site activated; callback pending. Reconciliation will recover from the VPS manifest.',
  );
console.log(`Activated generation ${manifest.generation}.`);
