import { loadContent } from './content.ts';
import { validatePublication } from '../src/domain/publication.ts';

const errors = validatePublication(await loadContent(), process.argv.includes('--launch'));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Content and route validation passed.');
