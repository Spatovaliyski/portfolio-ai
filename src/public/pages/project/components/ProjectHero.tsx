import type { PortfolioContent, Project } from '../../../../domain/schema.ts';
import { MediaImage } from '../../../components/media/MediaImage.tsx';

export function ProjectHero({ content, project }: { content: PortfolioContent; project: Project }) {
  if (!project.heroMediaId) return null;

  return (
    <div className={`case-hero ${project.id === 'bausy' ? 'case-phone' : ''}`} data-drift>
      <MediaImage content={content} id={project.heroMediaId} eager />
    </div>
  );
}
