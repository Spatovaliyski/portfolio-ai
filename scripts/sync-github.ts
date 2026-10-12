import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { machine } from './machine.ts';
import { githubSchema, type GitHubSnapshot, type GitHubRepository } from '../src/domain/schema.ts';
import { ownerCommits, coherentSnapshot, type GitHubCommit } from '../src/domain/github.ts';
import { seedContent } from '../src/content/seed.ts';
import { records } from '../src/domain/schema.ts';

type Config = {
  repositories: Array<{ githubId: number; fullName: string }>;
  previous: GitHubSnapshot | null;
  jobId: string;
};
const local = process.argv.includes('--local');
const token = randomUUID();
const config = local
  ? {
      repositories: records(seedContent, 'repository'),
      previous: await readFile('content/github.json', 'utf8')
        .then((s) => githubSchema.parse(JSON.parse(s)))
        .catch(() => null),
      jobId: 'local',
    }
  : await machine<Config>({ action: 'sync-config', token });
const now = new Date().toISOString();
const from = new Date(Date.now() - 90 * 86400000).toISOString();
const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10',
};

if (process.env.GITHUB_PUBLIC_TOKEN)
  headers.Authorization = `Bearer ${process.env.GITHUB_PUBLIC_TOKEN}`;
class GitHubError extends Error {
  constructor(
    public status: number,
    path: string,
  ) {
    super(`GitHub ${status} at ${path.split('?')[0]}`);
  }
}

async function get<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.github.com${path}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) return response.json() as Promise<T>;
    const retry = Number(response.headers.get('retry-after') ?? 0);

    if ((response.status === 429 || response.status >= 500) && attempt < 2 && retry <= 30) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(1000 * (attempt + 1), retry * 1000)),
      );
      continue;
    }
    throw new GitHubError(response.status, path);
  }
  throw new Error('GitHub retries exhausted');
}

async function pages<T>(path: string, max = 30): Promise<{ items: T[]; complete: boolean }> {
  const items: T[] = [];

  for (let page = 1; page <= max; page++) {
    const batch = await get<T[]>(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );

    items.push(...batch);
    if (batch.length < 100) return { items, complete: true };
  }

  return { items, complete: false };
}

async function synchronize() {
  const owner = await get<{ id: number }>('/users/Spatovaliyski');
  const results: GitHubRepository[] = [];
  const failedIds: number[] = [];
  const excludedIds: number[] = [];
  const errors: string[] = [];

  for (const selected of config.repositories) {
    const old = config.previous?.repositories.find((repo) => repo.id === selected.githubId);

    try {
      const repo = await get<{
        id: number;
        full_name: string;
        private: boolean;
        visibility: string;
        description: string | null;
        html_url: string;
        stargazers_count: number;
        forks_count: number;
        archived: boolean;
        pushed_at: string;
        default_branch: string;
      }>(`/repositories/${selected.githubId}`);

      if (repo.private || repo.visibility !== 'public') {
        excludedIds.push(repo.id);
        continue;
      }
      const path = `/repos/${repo.full_name}`;
      const languages = await get<Record<string, number>>(`${path}/languages`);
      let commits = old?.commits ?? [];
      let coverage = old?.coverage ?? {
        from,
        to: now,
        complete: false,
        releasesComplete: false,
        pullRequestsComplete: false,
      };
      let commitFreshness = old?.freshness.commits ?? now;

      try {
        const data = await pages<GitHubCommit>(
          `${path}/commits?sha=${encodeURIComponent(repo.default_branch)}&since=${encodeURIComponent(from)}&until=${encodeURIComponent(now)}`,
        );

        commits = ownerCommits(data.items, owner.id, from, now);
        coverage = { ...coverage, from, to: now, complete: data.complete };
        commitFreshness = now;
        if (!data.complete)
          errors.push(
            `${repo.full_name}: commit history is partial (bounded 3000-commit backfill).`,
          );
      } catch (e) {
        errors.push((e as Error).message);
        if (!old) throw e;
      }
      let releases = old?.releases ?? [];
      let releaseFreshness = old?.freshness.releases ?? null;

      try {
        const data = await pages<{
          draft: boolean;
          tag_name: string;
          name: string | null;
          html_url: string;
          published_at: string | null;
        }>(`${path}/releases`, 3);

        coverage.releasesComplete = data.complete;
        releases = data.items
          .filter((r) => !r.draft && r.published_at)
          .map((r) => ({
            tag: r.tag_name,
            name: r.name ?? r.tag_name,
            url: r.html_url,
            date: r.published_at!,
          }));
        releaseFreshness = now;
      } catch (e) {
        errors.push((e as Error).message);
      }
      let pullRequests = old?.pullRequests ?? [];
      let prFreshness = old?.freshness.pullRequests ?? null;

      try {
        const data = await pages<{
          number: number;
          title: string;
          html_url: string;
          merged_at: string | null;
          user: { id: number };
        }>(`${path}/pulls?state=closed&sort=updated&direction=desc`, 10);

        coverage.pullRequestsComplete = data.complete;
        pullRequests = data.items
          .filter((pr) => pr.merged_at && pr.merged_at >= from && pr.user.id === owner.id)
          .map((pr) => ({
            number: pr.number,
            title: pr.title,
            url: pr.html_url,
            mergedAt: pr.merged_at!,
          }));
        prFreshness = now;
      } catch (e) {
        errors.push((e as Error).message);
      }
      results.push({
        id: repo.id,
        fullName: repo.full_name,
        description: repo.description ?? '',
        url: repo.html_url,
        languages,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        archived: repo.archived,
        updatedAt: repo.pushed_at,
        commits,
        releases,
        pullRequests,
        coverage,
        freshness: {
          metadata: now,
          languages: now,
          commits: commitFreshness,
          releases: releaseFreshness,
          pullRequests: prFreshness,
        },
      });
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) excludedIds.push(selected.githubId);
      else {
        failedIds.push(selected.githubId);
        errors.push((e as Error).message);
      }
    }
  }
  const previous = config.previous ?? {
    account: 'Spatovaliyski',
    fetchedAt: null,
    repositories: [],
    errors: [],
    excludedIds: [],
  };
  const snapshot = coherentSnapshot(
    previous,
    results,
    failedIds,
    excludedIds,
    config.repositories.map((repo) => repo.githubId),
    now,
    errors,
  );

  await mkdir('content', { recursive: true });
  await writeFile('content/github.json', JSON.stringify(snapshot, null, 2));
  if (!local)
    await machine({
      action: 'sync-result',
      token,
      jobId: config.jobId,
      snapshot,
      refresh: process.argv.includes('--refresh'),
    });
  console.log(
    `Synchronized ${snapshot.repositories.length} public repositories; ${errors.length} dataset warnings; ${excludedIds.length} excluded.`,
  );
}
try {
  await synchronize();
} catch (error) {
  if (!local) {
    try {
      await machine({
        action: 'sync-failure',
        token,
        jobId: config.jobId,
        error: (error as Error).message.slice(0, 1000),
      });
    } catch {
      /* Expired leases are marked failed by the next run. */
    }
  }
  throw error;
}
