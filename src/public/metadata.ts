import type { PortfolioContent } from '../domain/schema.ts';
import { records } from '../domain/records.ts';
import { projectPath } from './routes.ts';

export function pageMetadata(
  content: PortfolioContent,
  path: string,
  socialPath = '/social-preview.svg',
) {
  const settings = records(content, 'settings')[0];
  const profile = records(content, 'profile')[0];
  const project = records(content, 'project').find((project) => projectPath(project) === path);
  const note = records(content, 'note').find((note) => `/notes/${note.slug}/` === path);
  const page = records(content, 'page').find((page) => page.path === path);
  const seo = project?.seo ??
    note?.seo ??
    page?.seo ?? {
      title: 'Page not found — Martin Spatovaliyski',
      description: 'Find your way back to selected work and contact details.',
    };
  const image =
    'imageId' in seo
      ? records(content, 'media').find((media) => media.id === seo.imageId)?.publicPath
      : null;
  const structured =
    path === '/'
      ? {
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          mainEntity: {
            '@type': 'Person',
            name: profile.name,
            url: settings.siteUrl,
            sameAs: profile.links.map((link) => link.url),
          },
        }
      : note
        ? {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: note.title,
            author: { '@type': 'Person', name: profile.name },
            datePublished: note.publishedAt,
            dateModified: note.modifiedAt,
          }
        : null;

  return {
    title: seo.title,
    description: seo.description,
    canonical: settings.siteUrl + path,
    image: settings.siteUrl + (image || socialPath),
    type: note ? 'article' : 'website',
    theme: settings.theme.canvas,
    noIndex: path === '/404/',
    structured,
  };
}

export type PageMetadata = ReturnType<typeof pageMetadata>;
