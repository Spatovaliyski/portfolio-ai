import type { PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { RepositoryCard } from './components/RepositoryCard.tsx';
import { RepositoryFilters } from './components/RepositoryFilters.tsx';
import { ActivityCalendar } from './components/ActivityCalendar.tsx';
import { MostActiveRepository } from './components/MostActiveRepository.tsx';
import { useRepositoryFilters } from './hooks/useRepositoryFilters.ts';
import { selectRepositories } from './selectRepositories.ts';

export function GitHubPage({ content }: { content: PortfolioContent }) {
  const snapshot = content.github;
  const labels = records(content, 'settings')[0].labels;
  const filters = useRepositoryFilters();
  const { languages, complete, repositories, mostActive } = selectRepositories(snapshot, filters);

  return (
    <div className="github-explorer">
      <p className="scope-note">
        {labels.publicScope}.{' '}
        {snapshot.fetchedAt
          ? `${labels.updated} ${snapshot.fetchedAt.slice(0, 16).replace('T', ' ')} UTC`
          : labels.noGitHub}
      </p>
      <RepositoryFilters
        labels={labels}
        {...filters}
        onChange={filters.update}
        languages={languages}
        complete={complete}
      />
      <p role="status">
        {repositories.length} {labels.results}
      </p>
      {mostActive && <MostActiveRepository repository={mostActive} label={labels.mostActive} />}
      <p className="scope-note">{labels.activeDefinition}</p>
      {snapshot.errors.length > 0 && (
        <p className="notice">
          Some data could not be refreshed. Each dataset retains its last successful timestamp.
        </p>
      )}
      <div className="repo-list">
        {repositories.map((repository) => (
          <RepositoryCard
            key={repository.id}
            repository={repository}
            content={content}
            labels={labels}
          />
        ))}
      </div>
      <p className="scope-note">{labels.languageDefinition}</p>
      <ActivityCalendar snapshot={snapshot} />
    </div>
  );
}
