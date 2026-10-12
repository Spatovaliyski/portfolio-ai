import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { TextLink } from '../../../components/ui/TextLink.tsx';
import { ProjectRow } from '../../../components/projects/ProjectRow.tsx';
import styles from '../../../app.module.css';

export function ProfessionalWork({ content }: { content: PortfolioContent }) {
  const projects = records(content, 'project').filter(
    (project) => project.id !== 'bausy' && ['product', 'professional'].includes(project.kind),
  );
  const labels = records(content, 'settings')[0].labels;

  return (
    <section className={styles.workSection}>
      {projects.map((project, index) => (
        <ProjectRow content={content} project={project} index={index + 2} key={project.id} />
      ))}
      <div className={styles.sectionEnd}>
        <TextLink href="/projects/">{labels.allWork}</TextLink>
      </div>
    </section>
  );
}
