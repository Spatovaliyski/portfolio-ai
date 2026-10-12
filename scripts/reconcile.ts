import { execFileSync } from 'node:child_process';
import { machine } from './machine.ts';

const target = process.env.PORTFOLIO_SSH_TARGET;
const root = process.env.PORTFOLIO_DEPLOY_ROOT || '/var/www/spatovaliyski.com';

if (
  !target ||
  !/^[a-zA-Z0-9][a-zA-Z0-9_.@-]+$/.test(target) ||
  !/^\/[a-zA-Z0-9/_-]+$/.test(root) ||
  root === '/'
)
  throw new Error('SSH target and deployment root required');
const manifest = JSON.parse(
  execFileSync(
    'ssh',
    [
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=yes',
      target,
      `cat ${root}/current/release.json`,
    ],
    { encoding: 'utf8' },
  ),
);

if (!/^[a-f0-9-]{36}$/.test(manifest.releaseId) || !Number.isSafeInteger(manifest.generation))
  throw new Error('Invalid VPS manifest');
await machine({
  action: 'report',
  releaseId: manifest.releaseId,
  buildId: manifest.buildId,
  state: 'deployed',
});
console.log(`Reconciled generation ${manifest.generation}.`);
