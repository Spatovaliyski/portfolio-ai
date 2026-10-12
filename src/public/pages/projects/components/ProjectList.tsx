import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { ProjectRow } from '../../../components/projects/ProjectRow.tsx';

export function ProjectList({ content }: { content: PortfolioContent }) {
  const projects = records(content, 'project').filter((project) =>
    ['product', 'professional'].includes(project.kind),
  );

  return (
    <div>
      {projects.map((project, index) => (
        <ProjectRow content={content} project={project} index={index + 1} key={project.id} />
      ))}
    </div>
  );
}
