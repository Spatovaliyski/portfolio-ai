import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import type { PortfolioContent } from '../../domain/schema.ts';
import { records } from '../../domain/records.ts';
import { projectPath } from '../routes.ts';
import { pageMetadata } from '../metadata.ts';
import { updateMetadata } from './updateMetadata.ts';

type Position = { x: number; y: number };

function rememberScroll(): void {
  history.replaceState({ ...history.state, portfolioScroll: { x: scrollX, y: scrollY } }, '');
}

function restorePosition(url: URL, position?: Position): void {
  if (position) {
    window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });

    return;
  }

  if (!url.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    return;
  }

  let id = url.hash.slice(1);

  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed fragment remains a literal ID.
  }

  const destination = document.getElementById(id);

  if (destination) destination.scrollIntoView({ behavior: 'instant' });
  else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

export function usePortfolioNavigation(
  content: PortfolioContent,
  initialPath: string,
  socialPreviews: Record<string, string>,
) {
  const [path, setPath] = useState(initialPath);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const knownPaths = new Set([
      ...records(content, 'page').map((page) => page.path),
      ...records(content, 'project')
        .filter((project) => project.kind !== 'archive')
        .map(projectPath),
      ...records(content, 'note').map((note) => `/notes/${note.slug}/`),
      '/404/',
    ]);
    const redirects = records(content, 'redirect');
    const previousRestoration = history.scrollRestoration;
    let scrollFrame = 0;

    history.scrollRestoration = 'manual';
    rememberScroll();

    function cancelScrollFrame() {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = 0;
    }

    function onScroll() {
      if (scrollFrame) return;

      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        rememberScroll();
      });
    }

    function resolvePath(url: URL): string | null {
      const canonical = url.pathname === '/' ? '/' : `${url.pathname.replace(/\/$/, '')}/`;
      const redirect = redirects.find(
        (item) => item.from.replace(/\/$/, '') === url.pathname.replace(/\/$/, ''),
      );
      const target = redirect?.to ?? canonical;

      return knownPaths.has(target) ? target : null;
    }

    function render(url: URL, target: string, position?: Position) {
      const metadata = pageMetadata(content, target, socialPreviews[target]);

      flushSync(() => {
        setPath(target);
        setAnnouncement(metadata.title);
      });
      updateMetadata(metadata);
      document.documentElement.dataset.path = target;
      document.getElementById('main')?.focus({ preventScroll: true });
      restorePosition(url, position);
    }

    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;

      const anchor =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;

      if (
        !anchor ||
        anchor.hasAttribute('download') ||
        anchor.hasAttribute('data-document-navigation') ||
        (anchor.target && anchor.target !== '_self')
      )
        return;

      const url = new URL(anchor.href, location.href);

      if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return;
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

      const target = resolvePath(url);

      if (!target) return;

      event.preventDefault();
      cancelScrollFrame();
      rememberScroll();
      url.pathname = target;

      if (url.href !== location.href)
        history.pushState({ portfolioScroll: { x: 0, y: 0 } }, '', url);

      render(url, target);
    }

    function popstate(event: PopStateEvent) {
      cancelScrollFrame();

      const url = new URL(location.href);
      const target = resolvePath(url);

      if (!target) {
        location.reload();

        return;
      }

      render(url, target, event.state?.portfolioScroll);
    }

    document.addEventListener('click', click);
    window.addEventListener('popstate', popstate);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelScrollFrame();
      document.removeEventListener('click', click);
      window.removeEventListener('popstate', popstate);
      window.removeEventListener('scroll', onScroll);
      history.scrollRestoration = previousRestoration;
    };
  }, [content, socialPreviews]);

  return { path, announcement };
}
