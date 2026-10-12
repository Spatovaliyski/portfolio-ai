import type { GitHubSnapshot } from '../../../domain/schema.ts';

type Filters = { search: string; language: string; sort: string };

export function selectRepositories(snapshot: GitHubSnapshot, filters: Filters) {
  const languages = [
    ...new Set(snapshot.repositories.flatMap((repository) => Object.keys(repository.languages))),
  ].sort();
  const complete =
    snapshot.repositories.length > 0 &&
    snapshot.repositories.every(
      (repository) => repository.coverage.complete && repository.coverage.to === snapshot.fetchedAt,
    );
  const repositories = snapshot.repositories
    .filter(
      (repository) =>
        `${repository.fullName} ${repository.description}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()) &&
        (!filters.language || filters.language in repository.languages),
    )
    .sort((left, right) => {
      if (filters.sort === 'stars') return right.stars - left.stars;
      if (filters.sort === 'active' && complete) return right.commits.length - left.commits.length;

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  const mostActive = complete
    ? [...snapshot.repositories].sort(
        (left, right) => right.commits.length - left.commits.length,
      )[0]
    : undefined;

  return { languages, complete, repositories, mostActive };
}
