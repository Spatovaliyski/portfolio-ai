import type { AnchorHTMLAttributes } from 'react';
import { Arrow } from './Arrow.tsx';

export function TextLink({
  className,
  children,
  arrow = true,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { arrow?: boolean }) {
  return (
    <a {...props} className={['text-link', className].filter(Boolean).join(' ')}>
      {children}
      {arrow && (
        <>
          {' '}
          <Arrow />
        </>
      )}
    </a>
  );
}
