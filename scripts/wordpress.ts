import sanitizeHtml from 'sanitize-html';
import TurndownService from 'turndown';
import { entitySchema, type Entity, type ContentBlock } from '../src/domain/schema.ts';

export type WP = {
  id: number;
  slug: string;
  title: { rendered: string };
  content?: { rendered: string };
  the_content?: string;
  date_gmt: string;
  modified_gmt: string;
  company_position?: string;
  location?: string;
  start_year?: string;
  end_year?: string;
  repository?: string;
  tags?: unknown;
  featured_media?: number;
};

export type LegacyMedia = {
  id: number;
  sourceUrl: string;
  mimeType: string;
  title: string;
  alt: string;
  path: string;
  width: number;
  height: number;
  downloaded: boolean;
};
const td = new TurndownService({ headingStyle: 'atx' });

export const plain = (html: string) =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–');

export function prose(html: string) {
  return td.turndown(
    sanitizeHtml(html, {
      allowedTags: [
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'ul',
        'ol',
        'li',
        'h2',
        'h3',
        'h4',
        'blockquote',
        'a',
        'pre',
        'code',
      ],
      allowedAttributes: { a: ['href'] },
      allowedSchemes: ['https', 'mailto'],
      allowProtocolRelative: false,
      nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe'],
    }),
  );
}

export function careerDate(value: string, end = false): string | null {
  if (/^(now|present|current)$/i.test(value.trim())) return null;
  const match = value.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i,
  );

  if (!match) return null;
  const month =
    [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ].indexOf(match[1].toLowerCase()) + 1;
  const day = end ? new Date(Date.UTC(Number(match[2]), month, 0)).getUTCDate() : 1;

  return `${match[2]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function importWordPress(
  collections: { projects: WP[]; experience: WP[]; posts: WP[]; media: LegacyMedia[] },
  sizes: Record<number, number>,
) {
  const entities: Entity[] = [];
  const issues: string[] = [];
  const mediaId = (id: number) => `wp-spatovaliyski-media-${id}`;

  for (const item of collections.media) {
    if (
      !item.downloaded ||
      !['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'application/pdf'].includes(
        item.mimeType,
      )
    ) {
      issues.push(`Media ${item.id}: unsupported original retained in archive.`);
      continue;
    }
    const extension = item.mimeType === 'application/pdf' ? 'pdf' : item.mimeType.split('/')[1];

    entities.push(
      entitySchema.parse({
        id: mediaId(item.id),
        kind: 'media',
        status: 'draft',
        sortOrder: item.id,
        data: {
          path: `legacy/wp-${item.id}.${extension}`,
          mime: item.mimeType,
          width: item.width || null,
          height: item.height || null,
          bytes: sizes[item.id],
          alt: item.alt,
          caption: item.title,
          sourceUrl: item.sourceUrl,
          rights: 'Previously published portfolio media; confirm publication rights.',
        },
      }),
    );
  }

  function blocks(post: WP, html: string): ContentBlock[] {
    if (/\[[a-z][a-z0-9_-]*(?:\s|\])/i.test(html) || /<(?:script|iframe|style)\b/i.test(html))
      issues.push(
        `${post.id}: unsupported shortcode/embed preserved in export; review the sanitized draft.`,
      );
    const result: ContentBlock[] = [];
    let offset = 0;
    const add = (text: string) => {
      const markdown = prose(text);

      if (markdown.trim())
        result.push({ id: `wp-${post.id}-block-${result.length}`, type: 'prose', markdown });
    };

    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      add(html.slice(offset, match.index));
      offset = match.index! + match[0].length;
      const src = match[0].match(/\bsrc=["']([^"']+)["']/i)?.[1];
      const normalize = (url: string) =>
        decodeURI(url)
          .replace(/-\d+x\d+(?=\.[a-z]+$)/i, '')
          .replace('https://spatovaliyski.com/', 'https://wp.spatovaliyski.com/');
      const item = collections.media.find(
        (item) => src && normalize(item.sourceUrl) === normalize(src),
      );

      if (!item || !entities.some((e) => e.id === mediaId(item.id))) {
        issues.push(
          `${post.id}: unresolved inline image ${src ?? 'without source'} preserved in export.`,
        );
        continue;
      }
      const alt = plain(match[0].match(/\balt=["']([^"']*)["']/i)?.[1] ?? item.alt);

      if (!alt) issues.push(`${post.id}: contextual alt text required for media ${item.id}.`);
      result.push({
        id: `wp-${post.id}-block-${result.length}`,
        type: 'image',
        mediaId: mediaId(item.id),
        alt,
        caption: '',
      });
    }
    add(html.slice(offset));

    return result;
  }
  const tags = (post: WP): string[] =>
    Array.isArray(post.tags)
      ? post.tags.filter((tag): tag is string => typeof tag === 'string')
      : typeof post.tags === 'string'
        ? post.tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

  for (const post of collections.projects) {
    const html = post.the_content ?? post.content?.rendered ?? '';
    const title = plain(post.title.rendered);
    const body = prose(html);
    const hero = entities.some((e) => e.id === mediaId(post.featured_media ?? 0))
      ? mediaId(post.featured_media!)
      : null;

    entities.push(
      entitySchema.parse({
        id: `wp-spatovaliyski-work_projects-${post.id}`,
        kind: 'project',
        status: 'draft',
        sortOrder: post.id,
        data: {
          slug: post.slug,
          title,
          kind: title === 'CILECT' ? 'professional' : 'archive',
          status: 'archived',
          summary: body.slice(0, 240),
          ownership:
            'Imported from the existing portfolio; confirm personal contribution before publication.',
          dates: String(post.end_year ?? ''),
          technologies: tags(post),
          links:
            post.repository && /^https:\/\//.test(post.repository)
              ? [{ label: 'Original project link', url: post.repository }]
              : [],
          blocks: blocks(post, html),
          heroMediaId: hero,
          repositoryIds: [],
          featured: false,
          seo: { title, description: body.slice(0, 160) },
        },
      }),
    );
    if (post.tags && !tags(post).length)
      issues.push(`${post.id}: non-text custom tags require review; original preserved.`);
  }
  for (const post of collections.experience) {
    const start = careerDate(post.start_year ?? '');
    const end = careerDate(post.end_year ?? '', true);

    if (!start) {
      issues.push(`Experience ${post.id}: unresolved date preserved; no career dates invented.`);
      continue;
    }
    if (post.end_year && !end && !/now|present/i.test(post.end_year))
      issues.push(`Experience ${post.id}: unresolved end date requires review.`);
    entities.push(
      entitySchema.parse({
        id: `wp-spatovaliyski-work_experience-${post.id}`,
        kind: 'experience',
        status: 'draft',
        sortOrder: post.id,
        data: {
          employer: plain(post.title.rendered),
          role: post.company_position ?? '',
          start,
          end,
          location: post.location ?? '',
          summary: prose(post.the_content ?? ''),
          achievements: [],
          projectIds: [],
          sourceUrl: 'https://spatovaliyski.com/experience',
        },
      }),
    );
  }
  const noteSlugs: Record<number, string> = {
    220: 'ludum-dare-55-summoning',
    189: 'improving-the-interface',
    121: 'is-anyone-there',
  };

  for (const post of collections.posts) {
    const html = post.content?.rendered ?? '';
    const body = prose(html);
    const slug = noteSlugs[post.id] ?? post.slug;
    const title = plain(post.title.rendered);

    entities.push(
      entitySchema.parse({
        id: `wp-spatovaliyski-posts-${post.id}`,
        kind: 'note',
        status: 'draft',
        sortOrder: post.id,
        data: {
          slug,
          title,
          summary: body.slice(0, 220),
          publishedAt: post.date_gmt + 'Z',
          modifiedAt: post.modified_gmt + 'Z',
          tags: tags(post),
          blocks: blocks(post, html),
          projectIds: [],
          seo: { title, description: body.slice(0, 160) },
        },
      }),
    );
    entities.push(
      entitySchema.parse({
        id: `wp-spatovaliyski-redirect-${post.id}`,
        kind: 'redirect',
        status: 'draft',
        sortOrder: post.id,
        data: {
          from: `/blog/${post.id}`,
          to: `/notes/${slug}/`,
          status: 301,
          reason: 'Preserve the original article URL.',
        },
      }),
    );
  }

  return { entities, issues };
}
