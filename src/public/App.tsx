import type { CSSProperties } from 'react';
import type { PortfolioContent } from '../domain/schema.ts';
import { records } from '../domain/records.ts';
import { RoutePage } from './RoutePage.tsx';
import { SiteHeader } from './SiteHeader.tsx';
import { SiteFooter } from './SiteFooter.tsx';
import { useEditorialMotion } from './useMotion.ts';
import styles from './app.module.css';

export function PublicApp({ content, path }: { content: PortfolioContent; path: string }) {
  useEditorialMotion(path);
  const settings = records(content, 'settings')[0];

  return (
    <div
      className={styles.site}
      style={
        {
          '--canvas': settings.theme.canvas,
          '--ink': settings.theme.ink,
          '--cobalt': settings.theme.accent,
        } as CSSProperties
      }
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader content={content} path={path} />
      <main id="main" tabIndex={-1}>
        <RoutePage key={path} content={content} path={path} />
      </main>
      <SiteFooter content={content} />
    </div>
  );
}
