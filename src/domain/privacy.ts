import { contentSchema, type PortfolioContent, type Entity } from './schema.ts';

export function referencedIds(entity: Entity): string[] {
  const data = entity.data;
  const ids: string[] = [];

  for (const field of ['heroMediaId', 'cvMediaId', 'projectId'])
    if (typeof data[field] === 'string') ids.push(data[field]);
  for (const field of ['projectIds', 'evidenceIds'])
    if (Array.isArray(data[field])) ids.push(...(data[field] as string[]));
  const seo = data.seo as { imageId?: string } | undefined;

  if (seo?.imageId) ids.push(seo.imageId);
  for (const block of (data.blocks ?? []) as Array<{
    mediaId?: string;
    images?: Array<{ mediaId: string }>;
    projectIds?: string[];
  }>) {
    if (block.mediaId) ids.push(block.mediaId);
    ids.push(...(block.images ?? []).map((image) => image.mediaId), ...(block.projectIds ?? []));
  }

  return [...new Set(ids)];
}

export function excludedReferences(content: PortfolioContent, ids: number[]): boolean {
  return (
    content.github.repositories.some((repo) => ids.includes(repo.id)) ||
    content.entities.some(
      (entity) =>
        (entity.kind === 'repository' && ids.includes(Number(entity.data.githubId))) ||
        (Array.isArray(entity.data.repositoryIds) &&
          entity.data.repositoryIds.some((id) => ids.includes(Number(id)))),
    )
  );
}

/** Privacy removals also remove serialized source links and editorial curation. */
export function purgeRepositories(
  content: PortfolioContent,
  ids: number[],
  known: Array<{ id: number; fullName: string }> = [],
): PortfolioContent {
  const names = [
    ...known.filter((r) => ids.includes(r.id)).map((r) => r.fullName),
    ...content.github.repositories.filter((r) => ids.includes(r.id)).map((r) => r.fullName),
    ...content.entities
      .filter((e) => e.kind === 'repository' && ids.includes(Number(e.data.githubId)))
      .map((e) => String(e.data.fullName)),
  ];
  const pattern = names.length
    ? new RegExp(
        `https://github\\.com/(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[/\\s)#?])[^\\s)"<>]*`,
        'gi',
      )
    : null;
  const clean = (value: unknown): unknown => {
    if (typeof value === 'string') return pattern ? value.replace(pattern, '/github/') : value;
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          key === 'repositoryIds' && Array.isArray(entry)
            ? entry.filter((id) => !ids.includes(Number(id)))
            : clean(entry),
        ]),
      );

    return value;
  };

  return contentSchema.parse({
    ...content,
    entities: content.entities
      .filter((e) => e.kind !== 'repository' || !ids.includes(Number(e.data.githubId)))
      .map((e) => ({ ...e, data: clean(e.data) })),
    github: {
      ...content.github,
      repositories: content.github.repositories.filter((r) => !ids.includes(r.id)),
      excludedIds: [...new Set([...content.github.excludedIds, ...ids])],
    },
  });
}
