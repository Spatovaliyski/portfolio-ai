import type { ContentBlock, PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { projectPath } from '../../routes.ts';

export function ReferenceLinks({ block }: { block: Extract<ContentBlock, { type: 'links' }> }) {
  return (
    <ul className="link-list">
      {block.links.map((link) => (
        <li key={link.url}>
          <a href={link.url}>{link.label} ↗</a>
        </li>
      ))}
    </ul>
  );
}

export function RelatedProjects({
  block,
  content,
}: {
  block: Extract<ContentBlock, { type: 'related' }>;
  content: PortfolioContent;
}) {
  const projects = records(content, 'project').filter((project) =>
    block.projectIds.includes(project.id),
  );

  return (
    <ul>
      {projects.map((project) => (
        <li key={project.id}>
          <a href={projectPath(project)}>{project.title}</a>
        </li>
      ))}
    </ul>
  );
}
