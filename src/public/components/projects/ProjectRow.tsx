import type { PortfolioContent, Project } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { Arrow } from '../ui/Arrow.tsx';
import { projectPath } from '../../routes.ts';
import { MediaImage } from '../media/MediaImage.tsx';
import styles from '../../app.module.css';

export function ProjectRow({
  content,
  project: item,
  index,
  flagship = false,
}: {
  content: PortfolioContent;
  project: Project;
  index: number;
  flagship?: boolean;
}) {
  const labels = records(content, 'settings')[0].labels;

  return (
    <article className={`${styles.projectRow} ${flagship ? styles.flagship : ''}`}>
      <div className={styles.projectCopy}>
        <div className={styles.projectTop}>
          <span className="eyebrow">
            0{index} /{' '}
            {item.kind === 'product' ? labels.independentProduct : labels.professionalWork}
          </span>
          <span className="status">{item.status}</span>
        </div>
        <h3>
          <a href={projectPath(item)}>
            {item.title}
            <Arrow />
          </a>
        </h3>
        <p>{item.summary}</p>
        <div className="tags">
          {item.technologies.map((technology) => (
            <span key={technology}>{technology}</span>
          ))}
        </div>
        <p className={styles.contribution}>{item.ownership}</p>
        <a className="text-link" href={projectPath(item)}>
          {labels.caseStudy} <Arrow />
        </a>
      </div>
      <a
        className={`${styles.projectMedia} ${item.id === 'bausy' ? styles.phoneMedia : ''}`}
        href={projectPath(item)}
        aria-label={`${labels.caseStudy}: ${item.title}`}
        data-drift
      >
        <MediaImage content={content} id={item.heroMediaId ?? ''} eager={flagship} />
        {item.id === 'bausy' && (
          <span className={styles.productCaption}>{labels.productCaption}</span>
        )}
      </a>
    </article>
  );
}
