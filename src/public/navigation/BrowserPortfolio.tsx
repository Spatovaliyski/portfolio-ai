import { useEffect, useState } from 'react';
import type { PortfolioContent } from '../../domain/schema.ts';
import { PublicApp } from '../App.tsx';
import { usePortfolioNavigation } from './usePortfolioNavigation.ts';
import { pageMetadata } from '../metadata.ts';
import { updateMetadata } from './updateMetadata.ts';

export function BrowserPortfolio({
  content: initial,
  initialPath,
  socialPreviews,
}: {
  content: PortfolioContent;
  initialPath: string;
  socialPreviews: Record<string, string>;
}) {
  const [content, setContent] = useState(initial);
  const { path, announcement } = usePortfolioNavigation(content, initialPath, socialPreviews);

  useEffect(() => {
    let disposed = false;
    let refreshing = false;

    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const response = await fetch('/api/content', {
          headers: { 'If-None-Match': '"' + content.releaseId + '"' },
          cache: 'no-store',
        });

        if (response.ok) {
          const next = (await response.json()) as PortfolioContent;

          if (!disposed && next.schemaVersion === 1 && next.releaseId !== content.releaseId)
            setContent(next);
        }
      } catch {
        /* Keep the already-rendered public version during temporary network failures. */
      } finally {
        refreshing = false;
      }
    }

    function click(e: MouseEvent) {
      const anchor = e.target instanceof Element ? e.target.closest('a[href]') : null;

      if (anchor && new URL(anchor.getAttribute('href')!, location.href).origin === location.origin)
        void refresh();
    }

    function focus() {
      if (document.visibilityState === 'visible') void refresh();
    }
    document.addEventListener('click', click);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    window.addEventListener('popstate', focus);

    return () => {
      disposed = true;
      document.removeEventListener('click', click);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
      window.removeEventListener('popstate', focus);
    };
  }, [content.releaseId]);
  useEffect(() => {
    updateMetadata(pageMetadata(content, path, socialPreviews[path]));
  }, [content, path, socialPreviews]);

  return (
    <>
      <PublicApp content={content} path={path} />
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
