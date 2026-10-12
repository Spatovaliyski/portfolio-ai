import { useContext, useEffect, useRef, useState } from 'react';
import type { PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { MediaUrlsContext } from './MediaUrlsContext.ts';
import { MediaImage } from './MediaImage.tsx';
import { Button } from '../ui/Button.tsx';

export function Screenshots({
  images,
  content,
}: {
  images: Array<{ mediaId: string; alt: string; caption: string }>;
  content: PortfolioContent;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const urls = useContext(MediaUrlsContext);

  useEffect(() => {
    if (selected !== null && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);

  return (
    <>
      <div className={images.length > 1 ? 'gallery' : ''}>
        {images.map((image, index) => (
          <figure key={`${image.mediaId}-${index}`}>
            <a
              href={
                urls[image.mediaId] ??
                records(content, 'media').find((m) => m.id === image.mediaId)?.publicPath
              }
              onClick={(event) => {
                if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
                  event.preventDefault();
                  setSelected(index);
                }
              }}
              aria-label={`Inspect screenshot: ${image.alt}`}
            >
              <MediaImage content={content} id={image.mediaId} alt={image.alt} />
            </a>
            <figcaption>{image.caption}</figcaption>
          </figure>
        ))}
      </div>
      {selected !== null && (
        <dialog
          className="screenshot-dialog"
          ref={dialog}
          onClose={() => setSelected(null)}
          aria-label="Screenshot viewer"
        >
          <header>
            <p>
              Screenshot {selected + 1} of {images.length}
            </p>
            <form method="dialog">
              <Button type="submit" autoFocus>
                Close viewer
              </Button>
            </form>
          </header>
          <MediaImage
            key={selected}
            className="dialog-image"
            content={content}
            id={images[selected].mediaId}
            alt={images[selected].alt}
            eager
          />
          <p>{images[selected].caption}</p>
          {images.length > 1 && (
            <div className="actions">
              <Button
                className="button"
                onClick={() => setSelected((selected - 1 + images.length) % images.length)}
              >
                Previous screenshot
              </Button>
              <Button
                className="button"
                onClick={() => setSelected((selected + 1) % images.length)}
              >
                Next screenshot
              </Button>
            </div>
          )}
        </dialog>
      )}
    </>
  );
}
