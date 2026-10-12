import type { GitHubRepository } from '../../../../domain/schema.ts';

export function LanguageDistribution({ repository: repo }: { repository: GitHubRepository }) {
  return (
    <div className="language-bars" aria-label="Language byte distribution">
      {Object.entries(repo.languages).map(([name, bytes]) => (
        <span key={name}>
          {name} · {new Intl.NumberFormat('en').format(bytes)} bytes
        </span>
      ))}
    </div>
  );
}
