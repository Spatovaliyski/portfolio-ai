import type { PortfolioContent } from '../../../domain/schema.ts';
import { ProjectList } from './components/ProjectList.tsx';

export function ProjectsPage({ content }: { content: PortfolioContent }) {
  return <ProjectList content={content} />;
}
