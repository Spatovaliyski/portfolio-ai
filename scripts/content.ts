import { readFile } from 'node:fs/promises';
import { contentSchema, githubSchema } from '../src/domain/schema.ts';
import { seedContent } from '../src/content/seed.ts';

export async function loadContent() {
  if (process.env.PORTFOLIO_RELEASE_ID && !process.env.PORTFOLIO_CONTENT_FILE)
    throw new Error('Production builds require the approved fixed snapshot file.');
  if (process.env.PORTFOLIO_CONTENT_FILE)
    return contentSchema.parse(
      JSON.parse(await readFile(process.env.PORTFOLIO_CONTENT_FILE, 'utf8')),
    );
  const content = structuredClone(seedContent);

  try {
    content.github = githubSchema.parse(JSON.parse(await readFile('content/github.json', 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  return content;
}
