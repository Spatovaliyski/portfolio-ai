import type { PortfolioContent } from '../../../../domain/schema.ts';
import { records } from '../../../../domain/records.ts';
import { Arrow } from '../../../components/ui/Arrow.tsx';
import { ButtonLink } from '../../../components/ui/Button.tsx';
import { TextLink } from '../../../components/ui/TextLink.tsx';
import styles from '../../../app.module.css';

export function Hero({ content }: { content: PortfolioContent }) {
  const profile = records(content, 'profile')[0];
  const labels = records(content, 'settings')[0].labels;
  const page = records(content, 'page').find((page) => page.path === '/');
  const [firstName, ...surname] = profile.name.split(' ');

  return (
    <section className={styles.hero}>
      <div className={styles.heroMeta}>
        <span className="eyebrow">{page?.eyebrow}</span>
        <span className="location">
          {profile.location} <Arrow />
        </span>
      </div>
      <div className={styles.heroGrid}>
        <div>
          <h1>
            {firstName}
            <br />
            <span>{surname.join(' ')}</span>
          </h1>
          <p className={styles.heroRole}>{profile.role}</p>
        </div>
        <div className={styles.heroStatement}>
          <span className={styles.heroMark} data-drift aria-hidden="true">
            ✳
          </span>
          <h2>{page?.title}</h2>
          <p>{profile.positioning}</p>
          <div className="actions">
            <ButtonLink href="/projects/">
              {labels.work} <Arrow />
            </ButtonLink>
            <TextLink href="/contact/">{labels.contact}</TextLink>
          </div>
        </div>
      </div>
      <div className={styles.heroBottom}>
        <span>
          <i aria-hidden="true" />
          {profile.availability ? labels.availableLabel : profile.availabilityLabel}
        </span>
        <a href="#selected-work">
          {labels.scroll} <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
