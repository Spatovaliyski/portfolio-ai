import type { GitHubRepository } from '../../../../domain/schema.ts';

export function MostActiveRepository({
  repository,
  label,
}: {
  repository: GitHubRepository;
  label: string;
}) {
  return (
    <aside className="activity-highlight">
      <span className="eyebrow">{label}</span>
      <h2>
        <a href={repository.url}>{repository.fullName.split('/')[1]}</a>
      </h2>
      <p>{repository.commits.length} matching commits</p>
    </aside>
  );
}
