import type { PageMetadata } from '../metadata.ts';

export function updateMetadata(metadata: PageMetadata): void {
  document.title = metadata.title;

  const fields = [
    ['name', 'description', metadata.description],
    ['property', 'og:title', metadata.title],
    ['property', 'og:description', metadata.description],
    ['property', 'og:url', metadata.canonical],
    ['property', 'og:type', metadata.type],
    ['property', 'og:image', metadata.image],
    ['name', 'theme-color', metadata.theme],
  ];

  for (const [attribute, name, value] of fields) {
    document.head
      .querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
      ?.setAttribute('content', value);
  }

  document.head.querySelector('link[rel="canonical"]')?.setAttribute('href', metadata.canonical);
  document.head.querySelector('meta[name="robots"]')?.remove();
  document.head.querySelector('script[type="application/ld+json"]')?.remove();

  if (metadata.noIndex) {
    const robots = document.createElement('meta');

    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.append(robots);
  }

  if (metadata.structured) {
    const data = document.createElement('script');

    data.type = 'application/ld+json';
    data.textContent = JSON.stringify(metadata.structured);
    document.head.append(data);
  }
}
