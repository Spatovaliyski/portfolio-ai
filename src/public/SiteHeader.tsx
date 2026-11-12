import type { PortfolioContent } from '../domain/schema.ts';
import { records } from '../domain/records.ts';
import { Arrow } from './components/ui/Arrow.tsx';
import { MobileMenu } from './components/site/MobileMenu.tsx';
import { PrimaryNav } from './components/site/PrimaryNav.tsx';
import styles from './app.module.css';

export function SiteHeader({ content, path }: { content: PortfolioContent; path: string }) {
  const profile = records(content, 'profile')[0];
  const settings = records(content, 'settings')[0];
  const labels = settings.labels;

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label={`${profile.name}, home`}>
        ms<span aria-hidden="true">.</span>
      </a>
      <PrimaryNav className={styles.desktopNav} links={settings.navigation} path={path} />
      <a className={styles.cvLink} href="/resume/">
        {labels.resume} <Arrow />
      </a>
      <MobileMenu content={content} path={path} />
    </header>
  );
}
