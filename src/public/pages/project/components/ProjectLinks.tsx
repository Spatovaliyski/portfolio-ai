import type { Project } from '../../../../domain/schema.ts';
import { TextLink } from '../../../components/ui/TextLink.tsx';

export function ProjectLinks({
  project,
  labels,
}: {
  project: Project;
  labels: Record<string, string>;
}) {
  return (
    <>
      <aside className="case-links">
        <h2>{labels.projectLinks}</h2>
        {project.links.map((link) => (
          <TextLink key={link.url} href={link.url}>
            {link.label}
          </TextLink>
        ))}
      </aside>
      <TextLink
        href={project.kind === 'pet-project' ? '/pet-projects/' : '/projects/'}
        arrow={false}
      >
        ← {labels.backToWork}
      </TextLink>
    </>
  );
}
