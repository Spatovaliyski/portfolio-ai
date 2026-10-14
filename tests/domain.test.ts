import { describe, expect, it } from 'vitest';
import { seedContent } from './fixtures/content.ts';
import { composeRelease, escapedJson, validatePublication } from '../src/domain/publication.ts';
import { entitySchema } from '../src/domain/schema.ts';
import { purgeRepositories, excludedReferences } from '../src/domain/privacy.ts';
import { coherentSnapshot, ownerCommits, type GitHubCommit } from '../src/domain/github.ts';

describe('public release boundary', () => {
  it('publishes only selected revisions and leaves the input untouched', () => {
    const base = structuredClone(seedContent);
    const selected = {
      ...base.entities.find((e) => e.id === 'bausy')!,
      data: { ...base.entities.find((e) => e.id === 'bausy')!.data, title: 'Approved edit' },
    };
    const result = composeRelease(base, [selected], 'release', 2, base.generatedAt);

    expect(result.entities.find((e) => e.id === 'bausy')!.data.title).toBe('Approved edit');
    expect(base.entities.find((e) => e.id === 'bausy')!.data.title).toBe('Bausy');
    expect(result.entities.find((e) => e.id === 'cilect')).toEqual(
      base.entities.find((e) => e.id === 'cilect'),
    );
  });
  it('archives selected content and rejects broken media and redirect loops', () => {
    const base = structuredClone(seedContent);
    const asset = base.entities.find((e) => e.id === 'bausy-hero')!;
    const result = composeRelease(
      base,
      [{ ...asset, status: 'archived' }],
      'release',
      2,
      base.generatedAt,
    );

    expect(validatePublication(result).join()).toContain('missing heroMediaId');
    base.entities.push({
      id: 'bad-redirect',
      kind: 'redirect',
      status: 'published',
      sortOrder: 1,
      data: { from: '/notes', to: '/blog', status: 301, reason: '' },
    });
    expect(validatePublication(base).join()).toContain('point directly');
  });
  it('rejects executable URLs and raw structured fields', () => {
    const project = structuredClone(seedContent.entities.find((e) => e.id === 'bausy')!);

    project.data.links = [{ label: 'bad', url: 'javascript:alert(1)' }];
    expect(entitySchema.safeParse(project).success).toBe(false);
    project.data.links = [];
    project.data.css = 'body{display:none}';
    expect(entitySchema.safeParse(project).success).toBe(false);
    expect(escapedJson({ body: '</script><script>alert(1)</script>' })).not.toContain('<');
  });
  it('removes private repositories from curation, project references and serialized source links', () => {
    const id = Number(seedContent.entities.find((e) => e.id === 'repo-platesct')!.data.githubId);
    const result = purgeRepositories(seedContent, [id]);

    expect(excludedReferences(result, [id])).toBe(false);
    expect(result.entities.find((e) => e.id === 'platesct')!.data.links).toContainEqual({
      label: 'Source on GitHub',
      url: '/github/',
    });
    expect(JSON.stringify(result.entities)).not.toContain('github.com/Spatovaliyski/PlateSCT');
    expect(seedContent.entities.some((e) => e.id === 'repo-platesct')).toBe(true);
  });
});
describe('GitHub attribution and failure retention', () => {
  const commit = (sha: string, author: number | null, parents = 1): GitHubCommit => ({
    sha,
    html_url: 'https://github.com/Spatovaliyski/PlateSCT/commit/' + sha,
    author: author === null ? null : { id: author },
    parents: Array.from({ length: parents }, () => ({ sha: 'parent' })),
    commit: { message: 'change\nmore', author: { date: '2026-10-01T23:45:00Z' } },
  });

  it('counts distinct owner-authored non-merge commits using UTC dates', () => {
    expect(
      ownerCommits(
        [commit('a', 7), commit('a', 7), commit('b', 8), commit('c', null), commit('d', 7, 2)],
        7,
        '2026-07-01T00:00:00Z',
        '2026-10-12T00:00:00Z',
      ),
    ).toEqual([
      {
        sha: 'a',
        message: 'change',
        url: 'https://github.com/Spatovaliyski/PlateSCT/commit/a',
        date: '2026-10-01T23:45:00Z',
      },
    ]);
  });
  it('does not invent activity on a provider outage', () => {
    const snapshot = coherentSnapshot(
      seedContent.github,
      [],
      [1],
      [],
      [1],
      '2026-10-12T00:00:00Z',
      ['outage'],
    );

    expect(snapshot.repositories).toEqual([]);
    expect(snapshot.errors).toEqual(['outage']);
  });
});
