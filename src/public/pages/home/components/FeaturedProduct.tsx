import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { ProjectRow } from '../../../components/projects/ProjectRow.tsx';
import styles from '../../../app.module.css';

export function FeaturedProduct({ content }: { content: PortfolioContent }) {
  const project = records(content, 'project').find((project) => project.id === 'bausy');
  const labels = records(content, 'settings')[0].labels;

  if (!project) return null;

  return (
    <section id="selected-work" className={styles.workSection}>
      <div className={styles.sectionHeading}>
        <span className="eyebrow">01 / {labels.selected}</span>
        <p>{labels.selectedBody}</p>
      </div>
      <ProjectRow content={content} project={project} index={1} flagship />
    </section>
  );
}
