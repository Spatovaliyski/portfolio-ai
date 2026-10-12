import { useContext } from 'react';
import type { PortfolioContent } from '../../../domain/schema.ts';
import { records } from '../../../domain/records.ts';
import { MediaUrlsContext } from './MediaUrlsContext.ts';

export function MediaImage({
  content,
  id,
  alt,
  className,
  eager = false,
}: {
  content: PortfolioContent;
  id: string;
  alt?: string;
  className?: string;
  eager?: boolean;
}) {
  const urls = useContext(MediaUrlsContext);
  const media = records(content, 'media').find((asset) => asset.id === id);
  const src = urls[id] ?? media?.publicPath;

  if (!media || !src) return null;

  return (
    <img
      className={className}
      src={src}
      alt={alt ?? media.alt}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      srcSet={
        !urls[id] ? media.variants?.map((v) => `${v.path} ${v.width}w`).join(', ') : undefined
      }
      sizes="(max-width: 768px) 90vw, 55vw"
    />
  );
}
