import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import styles from '../../../app.module.css';

export function EngineeringApproach({ content }: { content: PortfolioContent }) {
  const labels = records(content, 'settings')[0].labels;

  return (
    <section className={styles.approach}>
      <span className="eyebrow">03 / {labels.approachLabel}</span>
      <h2>{labels.approachTitle}</h2>
      <div>
        {[1, 2, 3].map((index) => (
          <article key={index}>
            <span>0{index}</span>
            <h3>{labels[`approach${index}`]}</h3>
            <p>{labels[`approach${index}Body`]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
