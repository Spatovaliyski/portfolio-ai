import { access } from 'node:fs/promises';
import { machine } from './machine.ts';

// An activated site remains deployed even when a later callback fails.
const activated = await access('dist/activated.json')
  .then(() => true)
  .catch(() => false);

if (!activated)
  await machine({
    action: 'report',
    releaseId: process.env.PORTFOLIO_RELEASE_ID,
    buildId: process.env.GITHUB_SHA,
    state: process.argv[2] ?? 'failed',
    error: 'GitHub workflow failed. Inspect the protected workflow log.',
  });
