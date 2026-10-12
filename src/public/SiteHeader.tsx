import { useEffect, useRef, useState } from 'react';
import type { PortfolioContent } from '../domain/schema.ts';
import { records } from '../domain/records.ts';
import { Arrow } from './components/ui/Arrow.tsx';
import { PrimaryNav } from './components/site/PrimaryNav.tsx';
import styles from './app.module.css';

export function SiteHeader({ content, path }: { content: PortfolioContent; path: string }) {
  const profile = records(content, 'profile')[0];
  const settings = records(content, 'settings')[0];
  const labels = settings.labels;
  const [menu, setMenu] = useState(false);
  const disclosure = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (disclosure.current) disclosure.current.open = false;
    setMenu(false);
  }, [path]);

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label={`${profile.name}, home`}>
        ms<span aria-hidden="true">.</span>
      </a>
      <details
        ref={disclosure}
        className={styles.mobileMenu}
        onToggle={(event) => setMenu(event.currentTarget.open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary')?.focus();
          }
        }}
      >
        <summary
          className={styles.menuToggle}
          aria-label={menu ? labels.closeMenu : labels.openMenu}
        >
          {menu ? 'Close' : 'Menu'} <span aria-hidden="true">{menu ? '−' : '+'}</span>
        </summary>
        <PrimaryNav links={settings.navigation} path={path} />
      </details>
      <PrimaryNav className={styles.desktopNav} links={settings.navigation} path={path} />
      <a className={styles.cvLink} href="/resume/">
        {labels.resume} <Arrow />
      </a>
    </header>
  );
}
