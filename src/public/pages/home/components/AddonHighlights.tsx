import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { TextLink } from '../../../components/ui/TextLink.tsx';
import { AddonCard } from '../../../components/projects/AddonCard.tsx';
import styles from '../../../app.module.css';

export function AddonHighlights({ content }: { content: PortfolioContent }) {
  const projects = records(content, 'project').filter((project) => project.kind === 'pet-project');
  const labels = records(content, 'settings')[0].labels;

  return (
    <section className={styles.petSection}>
      <div className={styles.sectionHeading}>
        <span className="eyebrow">02 / {labels.petProjects}</span>
        <TextLink href="/pet-projects/">{labels.allPets}</TextLink>
      </div>
      <div className={styles.petIntro}>
        <h2>{labels.petTitle}</h2>
        <p>{labels.petBody}</p>
      </div>
      <div className={styles.petGrid}>
        {projects.map((project, index) => (
          <AddonCard
            key={project.id}
            project={project}
            index={index + 1}
            featuredLabel={labels.featured}
          />
        ))}
      </div>
    </section>
  );
}
