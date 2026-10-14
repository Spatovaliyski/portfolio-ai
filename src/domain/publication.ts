import { contentSchema, records, type Entity, type PortfolioContent } from './schema.ts';
import { referencedIds } from './privacy.ts';

export function routePaths(content: PortfolioContent): string[] {
  return [
    '/',
    '/projects/',
    '/pet-projects/',
    '/experience/',
    '/about/',
    '/github/',
    '/notes/',
    '/contact/',
    '/resume/',
    '/privacy/',
    ...records(content, 'project')
      .filter((p) => p.kind !== 'archive')
      .map((p) => `/${p.kind === 'pet-project' ? 'pet-projects' : 'projects'}/${p.slug}/`),
    ...records(content, 'note').map((n) => `/notes/${n.slug}/`),
  ];
}

export function composeRelease(
  base: PortfolioContent,
  selected: Entity[],
  releaseId: string,
  generation: number,
  now: string,
): PortfolioContent {
  const map = new Map(base.entities.map((entity) => [entity.id, entity]));

  selected.forEach((entity) => {
    if (entity.status === 'published') map.set(entity.id, entity);
    else map.delete(entity.id);
  });
  const published = [...map.values()].filter((entity) => entity.status === 'published');
  const usedMedia = new Set(
    published.filter((entity) => entity.kind !== 'media').flatMap(referencedIds),
  );

  return contentSchema.parse({
    ...base,
    releaseId,
    generation,
    generatedAt: now,
    entities: published.filter((entity) => entity.kind !== 'media' || usedMedia.has(entity.id)),
  });
}

export function validatePublication(content: PortfolioContent, _launch = false): string[] {
  const errors: string[] = [];

  if (records(content, 'profile').length !== 1 || records(content, 'settings').length !== 1)
    errors.push('Exactly one published profile and settings record are required.');
  const paths = routePaths(content);

  if (new Set(paths).size !== paths.length) errors.push('Published slugs collide.');
  const ids = new Set(content.entities.map((e) => e.id));

  if (ids.size !== content.entities.length) errors.push('Duplicate entity IDs.');
  const pages = records(content, 'page').map((page) => page.path);

  if (
    new Set(pages).size !== pages.length ||
    routePaths({
      ...content,
      entities: content.entities.filter((e) => !['project', 'note'].includes(e.kind)),
    }).some((path) => !pages.includes(path as (typeof pages)[number]))
  )
    errors.push('Exactly one page record per public collection route is required.');
  const media = new Map(records(content, 'media').map((m) => [m.id, m]));
  const curated = records(content, 'repository').map((repo) => repo.githubId);

  if (new Set(curated).size !== curated.length)
    errors.push('Curated repository IDs must be unique.');
  for (const entity of content.entities) {
    if (entity.status !== 'published')
      errors.push(`Private entity ${entity.id} appears in a public release.`);
    for (const reference of referencedIds(entity))
      if (!ids.has(reference)) errors.push(`${entity.id}: missing referenced record ${reference}.`);
    const seo = entity.data.seo as
      { title: string; description: string; imageId?: string } | undefined;

    if (seo && (!seo.title.trim() || !seo.description.trim()))
      errors.push(`${entity.id}: SEO title and description are required.`);
    if (
      seo?.imageId &&
      (!media.has(seo.imageId) || media.get(seo.imageId)?.mime === 'application/pdf')
    )
      errors.push(`${entity.id}: social preview requires an image asset.`);
    for (const id of (entity.data.projectIds ?? []) as string[])
      if (!content.entities.some((e) => e.id === id && e.kind === 'project'))
        errors.push(`${entity.id}: ${id} is not a project reference.`);
    for (const id of (entity.data.repositoryIds ?? []) as number[])
      if (!curated.includes(id))
        errors.push(`${entity.id}: explicitly curate repository ${id} before publication.`);
    const links = [
      ...((entity.data.links ?? []) as Array<{ url: string }>),
      ...((entity.data.navigation ?? []) as Array<{ url: string }>),
    ];

    for (const link of links)
      if (link.url.startsWith('/') && !paths.includes(link.url.split(/[?#]/)[0]))
        errors.push(`${entity.id}: link points to an unpublished route: ${link.url}.`);
    if (entity.kind === 'settings' && !validTheme(entity.data.theme as Theme))
      errors.push('Theme text, muted copy, accents, and actions must meet 4.5:1 contrast.');
    const blocks = (entity.data.blocks ?? []) as Array<{
      type: string;
      mediaId?: string;
      images?: Array<{ mediaId: string; alt: string }>;
      alt?: string;
      projectIds?: string[];
    }>;

    for (const block of blocks) {
      for (const image of block.type === 'gallery'
        ? (block.images ?? [])
        : block.type === 'image'
          ? [{ mediaId: block.mediaId!, alt: block.alt! }]
          : []) {
        if (!media.has(image.mediaId) || !image.alt.trim())
          errors.push(`${entity.id}: image requires a valid asset and contextual alt text.`);
      }
      if (block.type === 'related' && block.projectIds?.some((id) => !ids.has(id)))
        errors.push(`${entity.id}: broken related-project reference.`);
      if (
        block.type === 'decision' &&
        ['title', 'context', 'choice', 'alternatives', 'consequence'].some(
          (field) => !String((block as unknown as Record<string, unknown>)[field] ?? '').trim(),
        )
      )
        errors.push(`${entity.id}: complete all engineering-decision fields.`);
      if (block.type === 'metric') {
        const metric = (block as unknown as { metric: Record<string, string> }).metric;

        if (
          ['label', 'value', 'period', 'sourceUrl', 'verifiedAt'].some(
            (field) => !metric[field]?.trim(),
          )
        )
          errors.push(`${entity.id}: complete metric provenance is required.`);
      }
    }
    if (
      entity.kind === 'project' &&
      (!String(entity.data.ownership).trim() || !String(entity.data.summary).trim())
    )
      errors.push(`${entity.id}: ownership and summary are required.`);
    for (const field of ['heroMediaId', 'cvMediaId'])
      if (entity.data[field] && !media.has(String(entity.data[field])))
        errors.push(`${entity.id}: missing ${field}.`);
    if (
      entity.data.heroMediaId &&
      media.get(String(entity.data.heroMediaId))?.mime === 'application/pdf'
    )
      errors.push(`${entity.id}: choose an image for the main project image.`);
    if (
      entity.data.cvMediaId &&
      media.get(String(entity.data.cvMediaId))?.mime !== 'application/pdf'
    )
      errors.push(`${entity.id}: choose a PDF for the CV.`);
  }
  const redirects = records(content, 'redirect');
  const normalize = (path: string) => (path === '/' ? path : path.replace(/\/$/, ''));
  const from = new Set(redirects.map((r) => normalize(r.from)));

  if (from.size !== redirects.length) errors.push('Duplicate redirect sources.');
  for (const redirect of redirects)
    if (
      from.has(normalize(redirect.to)) ||
      paths.some((path) => normalize(path) === normalize(redirect.from)) ||
      !paths.includes(redirect.to)
    )
      errors.push(
        `Redirect ${redirect.from} must point directly to a published route without shadowing one.`,
      );

  return errors;
}

export function escapedJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function contrast(a: string, b: string): number {
  const light = (hex: string) => {
    const c = hex
      .slice(1)
      .match(/../g)!
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));

    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const [high, low] = [light(a), light(b)].sort((x, y) => y - x);

  return (high + 0.05) / (low + 0.05);
}

type Theme = { canvas: string; ink: string; accent: string };

export function validTheme(theme: Theme): boolean {
  return [
    [theme.ink, theme.canvas],
    [theme.accent, theme.canvas],
    ['#ffffff', theme.accent],
    ['#525866', theme.canvas],
    ['#b63e12', theme.canvas],
    ['#cdcbd0', theme.ink],
    [theme.ink, '#e6ebff'],
    [theme.ink, '#e9e5de'],
  ].every(([a, b]) => contrast(a, b) >= 4.5);
}
