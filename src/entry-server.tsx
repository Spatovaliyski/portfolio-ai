import { renderToString } from 'react-dom/server';
import { BrowserPortfolio } from './public/navigation/BrowserPortfolio.tsx';
import type { PortfolioContent } from './domain/schema.ts';
import { escapedJson } from './domain/publication.ts';
import { pageMetadata } from './public/metadata.ts';
import './styles/global.css';

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

export function renderPage(
  content: PortfolioContent,
  path: string,
  template: string,
  socialPreviews: Record<string, string> = {},
): string {
  const metadata = pageMetadata(content, path, socialPreviews[path]);
  const meta = [
    `<title>${escape(metadata.title)}</title>`,
    `<meta name="description" content="${escape(metadata.description)}">`,
    `<link rel="canonical" href="${escape(metadata.canonical)}">`,
    `<meta property="og:title" content="${escape(metadata.title)}">`,
    `<meta property="og:description" content="${escape(metadata.description)}">`,
    `<meta property="og:url" content="${escape(metadata.canonical)}">`,
    `<meta property="og:type" content="${metadata.type}">`,
    `<meta property="og:image" content="${escape(metadata.image)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="theme-color" content="${escape(metadata.theme)}">`,
    metadata.noIndex ? '<meta name="robots" content="noindex">' : '',
    metadata.structured
      ? `<script type="application/ld+json">${escapedJson(metadata.structured)}</script>`
      : '',
  ].join('\n');

  return template
    .replace('<html lang="en">', `<html lang="en" data-path="${escape(path)}">`)
    .replace('<!--meta-->', meta)
    .replace('<!--app-->', () =>
      renderToString(
        <BrowserPortfolio content={content} initialPath={path} socialPreviews={socialPreviews} />,
      ),
    )
    .replace(
      '<!--snapshot-->',
      () =>
        `<script id="portfolio-snapshot" type="application/json">${escapedJson(content)}</script>\n<script id="portfolio-social-previews" type="application/json">${escapedJson(socialPreviews)}</script>`,
    );
}
