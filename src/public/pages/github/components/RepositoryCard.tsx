import type { GitHubRepository, PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { projectPath } from '../../../routes.ts';
import { TextLink } from '../../../components/ui/TextLink.tsx';
import { RepositoryDetails } from './RepositoryDetails.tsx';
import { LanguageDistribution } from './LanguageDistribution.tsx';

export function RepositoryCard({
  repository: repo,
  content,
  labels,
}: {
  repository: GitHubRepository;
  content: PortfolioContent;
  labels: Record<string, string>;
}) {
  const curation = records(content, 'repository');
  const projects = records(content, 'project');

  return (
    <article className="repo">
      <header>
        <div>
          <h2>
            <a href={repo.url}>{repo.fullName.split('/')[1]} ↗</a>
          </h2>
          <p>{repo.description}</p>
        </div>
        <span>
          {repo.stars} ★ · {repo.forks} forks{repo.archived ? ' · Archived' : ''}
        </span>
      </header>
      {curation.find((c) => c.githubId === repo.id)?.featured && (
        <span className="pill">{labels.featured}</span>
      )}
      {projects
        .filter((project) => project.repositoryIds.includes(repo.id))
        .map((project) => (
          <TextLink key={project.id} href={projectPath(project)}>
            {project.title} · {labels.caseStudy}
          </TextLink>
        ))}
      <LanguageDistribution repository={repo} />
      <RepositoryDetails repository={repo} />
    </article>
  );
}
