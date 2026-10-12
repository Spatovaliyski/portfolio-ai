import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'light';

function buttonClassName(variant: Variant, className?: string): string {
  return ['button', variant === 'light' && 'button-light', className].filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} type={type} className={buttonClassName(variant, className)} />;
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant }) {
  return <a {...props} className={buttonClassName(variant, className)} />;
}
