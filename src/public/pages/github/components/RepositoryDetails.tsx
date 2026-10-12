import type { GitHubRepository } from '../../../../domain/schema.ts';

export function RepositoryDetails({ repository: repo }: { repository: GitHubRepository }) {
  return (
    <details>
      <summary>
        {repo.commits.length} commits · {repo.releases.length} releases · {repo.pullRequests.length}{' '}
        merged PRs
      </summary>
      <p className="scope-note">
        {repo.coverage.complete ? 'Complete' : 'Partial'} commit coverage:{' '}
        {repo.coverage.from.slice(0, 10)} to {repo.coverage.to.slice(0, 10)}. Commits updated{' '}
        {repo.freshness.commits.slice(0, 16)} UTC. Languages updated{' '}
        {repo.freshness.languages.slice(0, 16)} UTC. Releases:{' '}
        {repo.coverage.releasesComplete ? 'complete' : 'partial or unavailable'}, updated{' '}
        {repo.freshness.releases?.slice(0, 16) ?? 'never'}. Merged PRs:{' '}
        {repo.coverage.pullRequestsComplete ? 'complete' : 'partial or unavailable'}, updated{' '}
        {repo.freshness.pullRequests?.slice(0, 16) ?? 'never'}.
      </p>
      <ul>
        {repo.commits.slice(0, 10).map((commit) => (
          <li key={commit.sha}>
            <a href={commit.url}>{commit.message}</a>{' '}
            <time dateTime={commit.date}>{commit.date.slice(0, 10)}</time>
          </li>
        ))}
      </ul>
      <ul>
        {repo.releases.slice(0, 5).map((release) => (
          <li key={release.tag}>
            <a href={release.url}>{release.name || release.tag}</a> · {release.date.slice(0, 10)}
          </li>
        ))}
      </ul>
      <ul>
        {repo.pullRequests.slice(0, 5).map((pr) => (
          <li key={pr.number}>
            <a href={pr.url}>
              #{pr.number} {pr.title}
            </a>{' '}
            · {pr.mergedAt.slice(0, 10)}
          </li>
        ))}
      </ul>
    </details>
  );
}
