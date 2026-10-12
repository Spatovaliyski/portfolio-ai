import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PortfolioContent } from '../domain/schema.ts';
import { PublicApp } from '../public/App.tsx';
import { MediaUrlsContext } from '../public/components/media/MediaUrlsContext.ts';
import { records } from '../domain/records.ts';
import { supabase } from './api.ts';

export function DraftPreview({
  content,
  initialPath,
  width,
}: {
  content: PortfolioContent;
  initialPath: string;
  width: string;
}) {
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [path, setPath] = useState(initialPath);
  const mediaSignature = JSON.stringify(
    records(content, 'media').map((m) => ({ id: m.id, path: m.path })),
  );

  useEffect(() => {
    setPath(initialPath);
  }, [initialPath]);
  useEffect(() => {
    let disposed = false;
    const media = JSON.parse(mediaSignature) as Array<{ id: string; path: string }>;

    supabase.storage
      .from('portfolio-originals')
      .createSignedUrls(
        media.map((m) => m.path),
        120,
      )
      .then(({ data, error }) => {
        if (disposed) return;
        if (error) setError(error.message);
        else {
          setUrls(
            Object.fromEntries(
              (data ?? [])
                .filter((item) => !item.error && item.signedUrl)
                .map((item) => [media.find((m) => m.path === item.path)!.id, item.signedUrl!]),
            ),
          );
          setError(
            (data ?? []).some((item) => item.error)
              ? 'Some private originals are missing. Upload them before publication.'
              : '',
          );
        }
      });

    return () => {
      disposed = true;
    };
  }, [mediaSignature]);

  function load(element: HTMLIFrameElement) {
    const doc = element.contentDocument;

    if (!doc) return;
    for (const stylesheet of document.querySelectorAll('link[rel="stylesheet"], style'))
      doc.head.append(stylesheet.cloneNode(true));
    setReady(true);
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <iframe
        ref={setFrame}
        onLoad={(event) => load(event.currentTarget)}
        title="Private portfolio draft"
        sandbox="allow-same-origin"
        style={{ width, maxWidth: '100%', height: '80vh', border: 0, background: '#f5f2ec' }}
        srcDoc={
          '<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="preview"></div></body></html>'
        }
      />
      {ready &&
        frame?.contentDocument &&
        createPortal(
          <MediaUrlsContext.Provider value={urls}>
            <div
              onClick={(event) => {
                const anchor = (event.target as Element).closest('a');

                if (!anchor) return;
                const href = anchor.getAttribute('href');

                if (href?.startsWith('/') && !href.startsWith('/media/')) {
                  event.preventDefault();
                  setPath(href);
                  frame.contentWindow?.scrollTo(0, 0);
                }
              }}
            >
              <PublicApp content={content} path={path} />
            </div>
          </MediaUrlsContext.Provider>,
          frame.contentDocument.getElementById('preview')!,
        )}
    </>
  );
}
