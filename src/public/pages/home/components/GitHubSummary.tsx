import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { Arrow } from '../../../components/ui/Arrow.tsx';
import { TextLink } from '../../../components/ui/TextLink.tsx';
import { projectPath } from '../../../routes.ts';
import styles from '../../../app.module.css';

export function GitHubSummary({ content }: { content: PortfolioContent }) {
  const projects = records(content, 'project')
    .filter((project) => project.kind === 'pet-project')
    .slice(0, 3);
  const labels = records(content, 'settings')[0].labels;

  return (
    <section className={styles.githubPulse}>
      <div>
        <span className="eyebrow">04 / {labels.githubLabel}</span>
        <h2>{labels.githubTitle}</h2>
        <p>{labels.githubBody}</p>
        <TextLink href="/github/">{labels.githubExplore}</TextLink>
      </div>
      <div className={styles.repoTeaser}>
        {projects.map((project) => (
          <a key={project.id} href={project.links[0]?.url ?? projectPath(project)}>
            <span>{project.title}</span>
            <span>
              Lua <Arrow />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
