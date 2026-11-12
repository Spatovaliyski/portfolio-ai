import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { Arrow } from '../ui/Arrow.tsx';
import styles from '../../app.module.css';

export const mobileMenuId = 'site-menu';
const desktop = '(min-width: 801px)';

function isCurrent(url: string, path: string): boolean {
  return url === '/' ? path === '/' : path.startsWith(url);
}

/*
 * The sheet is a native popover, so the toggle, the close button and Escape work
 * from the server-rendered HTML before (or without) JavaScript. Scripts only add
 * focus placement, scroll locking and closing on route changes.
 */
export function MobileMenu({ content, path }: { content: PortfolioContent; path: string }) {
  const profile = records(content, 'profile')[0];
  const settings = records(content, 'settings')[0];
  const labels = settings.labels;
  const sheet = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function hide() {
    if (sheet.current?.matches(':popover-open')) sheet.current.hidePopover();
  }

  // Mirror the native popover state and move focus into the sheet when it opens.
  useEffect(() => {
    const element = sheet.current;

    if (!element) return;
    const onToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === 'open';

      setOpen(isOpen);
      if (isOpen) closeButton.current?.focus();
      // Never leave focus on a hidden control; route changes have already moved it to <main>.
      else if (element.contains(document.activeElement)) toggleButton.current?.focus();
    };

    element.addEventListener('toggle', onToggle);

    return () => element.removeEventListener('toggle', onToggle);
  }, []);

  // Navigating to a new route always leaves the menu closed.
  useEffect(hide, [path]);

  // The sheet only exists below the desktop breakpoint.
  useEffect(() => {
    const query = matchMedia(desktop);
    const onChange = () => query.matches && hide();

    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, []);

  // Freeze the page behind the sheet.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;

    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggleButton}
        type="button"
        className={styles.menuToggle}
        popoverTarget={mobileMenuId}
        popoverTargetAction="show"
        aria-label={labels.openMenu}
      >
        Menu <span className={styles.menuIcon} aria-hidden="true" />
      </button>
      <div
        ref={sheet}
        id={mobileMenuId}
        popover="auto"
        role="dialog"
        aria-label="Menu"
        className={styles.menuSheet}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a[href]')) hide();
        }}
      >
        <div className={styles.menuBar}>
          <a className={styles.brand} href="/" aria-label={`${profile.name}, home`}>
            ms<span aria-hidden="true">.</span>
          </a>
          <button
            ref={closeButton}
            type="button"
            className={styles.menuClose}
            popoverTarget={mobileMenuId}
            popoverTargetAction="hide"
            aria-label={labels.closeMenu}
          >
            Close <span className={styles.menuIcon} data-open aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.menuLinks} aria-label="Primary">
          <ol>
            {settings.navigation.map((link, index) => (
              <li key={link.url} style={{ '--i': index } as CSSProperties}>
                <a href={link.url} aria-current={isCurrent(link.url, path) ? 'page' : undefined}>
                  <span className={styles.menuIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.menuLabel}>{link.label}</span>
                  <Arrow />
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.menuFoot}>
          <p className={styles.menuStatus}>
            <i aria-hidden="true" />
            {profile.availability ? labels.availableLabel : profile.availabilityLabel}
          </p>
          <a className={styles.menuEmail} href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <div className={styles.menuSocial}>
            {profile.links.map((link) => (
              <a key={link.url} href={link.url}>
                {link.label} ↗
              </a>
            ))}
          </div>
          <a className={styles.menuCv} href="/resume/">
            {labels.resume} <Arrow />
          </a>
        </div>
      </div>
    </>
  );
}
