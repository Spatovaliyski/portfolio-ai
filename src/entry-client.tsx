import { hydrateRoot } from 'react-dom/client';
import { BrowserPortfolio } from './public/navigation/BrowserPortfolio.tsx';
import type { PortfolioContent } from './domain/schema.ts';
import './styles/global.css';

const snapshot = document.getElementById('portfolio-snapshot');

if (snapshot?.textContent) {
  const content = JSON.parse(snapshot.textContent) as PortfolioContent;
  const previews = document.getElementById('portfolio-social-previews');
  const socialPreviews = previews?.textContent
    ? (JSON.parse(previews.textContent) as Record<string, string>)
    : {};

  hydrateRoot(
    document.getElementById('root')!,
    <BrowserPortfolio
      content={content}
      initialPath={document.documentElement.dataset.path ?? location.pathname}
      socialPreviews={socialPreviews}
    />,
  );
}
