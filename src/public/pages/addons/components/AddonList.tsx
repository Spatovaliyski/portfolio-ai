import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { AddonCard } from '../../../components/projects/AddonCard.tsx';
import styles from '../../../app.module.css';

export function AddonList({ content }: { content: PortfolioContent }) {
  const addons = records(content, 'project').filter((project) => project.kind === 'pet-project');
  const labels = records(content, 'settings')[0].labels;

  return (
    <div className={styles.petGrid}>
      {addons.map((project) => (
        <AddonCard project={project} featuredLabel={labels.featured} key={project.id} />
      ))}
    </div>
  );
}
