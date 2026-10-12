import type { Project } from '../../../domain/schema.ts';
import { Arrow } from '../ui/Arrow.tsx';
import { projectPath } from '../../routes.ts';
import { Badge } from '../ui/Badge.tsx';
import styles from '../../app.module.css';

export function AddonCard({
  project,
  index,
  featuredLabel,
}: {
  project: Project;
  index?: number;
  featuredLabel: string;
}) {
  const Heading = index === undefined ? 'h2' : 'h3';

  return (
    <a className={styles.petCard} href={projectPath(project)}>
      {index !== undefined && (
        <span className={styles.addonNumber}>{String(index).padStart(2, '0')}</span>
      )}
      <div>
        <Heading>
          {project.title}
          {project.featured && <Badge>{featuredLabel}</Badge>}
        </Heading>
        <p>{project.summary}</p>
        <span className="eyebrow">Lua / {project.status}</span>
      </div>
      <Arrow />
    </a>
  );
}
