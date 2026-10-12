import { githubSchema, type GitHubSnapshot, type GitHubRepository } from './schema.ts';

export type GitHubCommit = {
  sha: string;
  html_url: string;
  author: { id: number } | null;
  parents: Array<{ sha: string }>;
  commit: { message: string; author: { date: string } | null };
};

export function ownerCommits(commits: GitHubCommit[], ownerId: number, from: string, to: string) {
  const seen = new Set<string>();

  return commits
    .filter((commit) => {
      const date = commit.commit.author?.date;

      if (
        seen.has(commit.sha) ||
        commit.author?.id !== ownerId ||
        commit.parents.length > 1 ||
        !date ||
        date < from ||
        date > to
      )
        return false;
      seen.add(commit.sha);

      return true;
    })
    .map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message.split('\n')[0].slice(0, 500),
      url: commit.html_url,
      date: commit.commit.author!.date,
    }));
}

export function coherentSnapshot(
  previous: GitHubSnapshot,
  results: GitHubRepository[],
  failedIds: number[],
  excludedIds: number[],
  allowedIds: number[],
  now: string,
  errors: string[],
) {
  const current = new Map(results.map((repo) => [repo.id, repo]));

  for (const repo of previous.repositories)
    if (
      allowedIds.includes(repo.id) &&
      failedIds.includes(repo.id) &&
      !excludedIds.includes(repo.id)
    )
      current.set(repo.id, repo);

  return githubSchema.parse({
    account: 'Spatovaliyski',
    fetchedAt: now,
    repositories: [...current.values()].filter(
      (repo) => allowedIds.includes(repo.id) && !excludedIds.includes(repo.id),
    ),
    errors,
    excludedIds: [
      ...new Set([
        ...previous.excludedIds.filter((id) => !results.some((r) => r.id === id)),
        ...excludedIds,
        ...previous.repositories
          .filter((repo) => !allowedIds.includes(repo.id))
          .map((repo) => repo.id),
      ]),
    ],
  });
}
