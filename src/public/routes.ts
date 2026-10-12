import type { Project } from '../domain/schema.ts';

export function projectPath(project: Project): string {
  return `/${project.kind === 'pet-project' ? 'pet-projects' : 'projects'}/${project.slug}/`;
}
