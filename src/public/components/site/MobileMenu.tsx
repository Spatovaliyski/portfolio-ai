import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { Arrow } from '../ui/Arrow.tsx';
import styles from '../../app.module.css';

const desktop = '(min-width: 801px)';
const exitMs = 260;

function isCurrent(url: string, path: string): boolean {
  return url === '/' ? path === '/' : path.startsWith(url);
}

function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MobileMenu({ content, path }: { content: PortfolioContent; path: string }) {
  const profile = records(content, 'profile')[0];
  const settings = records(content, 'settings')[0];
  const labels = settings.labels;
  const dialog = useRef<HTMLDialogElement>(null);
  const exitTimer = useRef(0);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeNow = useCallback(() => {
    window.clearTimeout(exitTimer.current);
    setClosing(false);
    setOpen(false);
    if (dialog.current?.open) dialog.current.close();
  }, []);
  const close = useCallback(() => {
    if (!dialog.current?.open) return;
    if (reducedMotion()) return closeNow();
    setClosing(true);
    window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(closeNow, exitMs);
  }, [closeNow]);

  function show() {
    window.clearTimeout(exitTimer.current);
    setClosing(false);
    dialog.current?.showModal();
    setOpen(true);
  }

  // Navigating to a new route always leaves the menu closed.
  useEffect(closeNow, [path, closeNow]);

  // The overlay only exists below the desktop breakpoint.
  useEffect(() => {
    const query = matchMedia(desktop);
    const onChange = () => query.matches && closeNow();

    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, [closeNow]);

  // Freeze the page behind the overlay.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;

    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  return (
    <>
      <button
        type="button"
        className={styles.menuToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={labels.openMenu}
        onClick={show}
      >
        Menu <span className={styles.menuIcon} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        className={styles.menuSheet}
        data-closing={closing || undefined}
        aria-label="Menu"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a[href]')) close();
        }}
      >
        <div className={styles.menuBar}>
          <a className={styles.brand} href="/" aria-label={`${profile.name}, home`}>
            ms<span aria-hidden="true">.</span>
          </a>
          <button
            type="button"
            className={styles.menuClose}
            aria-label={labels.closeMenu}
            onClick={close}
            autoFocus
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
      </dialog>
    </>
  );
}
