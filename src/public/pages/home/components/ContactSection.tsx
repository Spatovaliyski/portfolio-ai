import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { Arrow } from '../../../components/ui/Arrow.tsx';
import { ButtonLink } from '../../../components/ui/Button.tsx';
import styles from '../../../app.module.css';

export function ContactSection({ content }: { content: PortfolioContent }) {
  const profile = records(content, 'profile')[0];
  const labels = records(content, 'settings')[0].labels;

  return (
    <section className={styles.contactBand}>
      <span className="eyebrow">{labels.contactLabel}</span>
      <h2>{labels.contactTitle}</h2>
      <p>{labels.contactBody}</p>
      <ButtonLink variant="light" href={`mailto:${profile.email}`}>
        {labels.email} <Arrow />
      </ButtonLink>
      <a href="/experience/" className={styles.contactCareer}>
        {labels.experienceExplore} <Arrow />
      </a>
    </section>
  );
}
