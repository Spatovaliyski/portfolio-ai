import type { PortfolioContent, Project } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { Blocks } from '../../components/content/Blocks.tsx';
import { PageLayout } from '../../components/ui/PageLayout.tsx';
import { ProjectHero } from './components/ProjectHero.tsx';
import { ProjectLinks } from './components/ProjectLinks.tsx';
import { ProjectMetadata } from './components/ProjectMetadata.tsx';

export function ProjectPage({ content, project }: { content: PortfolioContent; project: Project }) {
  const labels = records(content, 'settings')[0].labels;

  return (
    <PageLayout
      eyebrow={project.kind === 'pet-project' ? labels.addonLabel : labels.selectedWork}
      title={project.title}
      introduction={project.summary}
    >
      <article className="case-study">
        <ProjectMetadata project={project} labels={labels} />
        <ProjectHero content={content} project={project} />
        <Blocks blocks={project.blocks} content={content} />
        <ProjectLinks project={project} labels={labels} />
      </article>
    </PageLayout>
  );
}
