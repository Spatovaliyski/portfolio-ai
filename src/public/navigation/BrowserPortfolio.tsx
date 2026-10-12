import type { PortfolioContent } from '../../domain/schema.ts';
import { PublicApp } from '../App.tsx';
import { usePortfolioNavigation } from './usePortfolioNavigation.ts';

export function BrowserPortfolio({
  content,
  initialPath,
  socialPreviews,
}: {
  content: PortfolioContent;
  initialPath: string;
  socialPreviews: Record<string, string>;
}) {
  const { path, announcement } = usePortfolioNavigation(content, initialPath, socialPreviews);

  return (
    <>
      <PublicApp content={content} path={path} />
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
