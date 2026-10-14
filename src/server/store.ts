import { isDeepStrictEqual } from 'node:util';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  entitySchema,
  contentSchema,
  type Entity,
  type PortfolioContent,
} from '../domain/schema.ts';
import { composeRelease, validatePublication } from '../domain/publication.ts';
import { referencedIds, purgeRepositories } from '../domain/privacy.ts';

export type ContentRow = {
  id: string;
  kind: Entity['kind'];
  status: Entity['status'];
  sort_order: number;
  data: Entity['data'];
  version: number;
  current_revision: string;
};

export const rowEntity = (row: ContentRow): Entity =>
  entitySchema.parse({
    id: row.id,
    kind: row.kind,
    status: row.status,
    sortOrder: row.sort_order,
    data: row.data,
  });

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function checked<T>(result: {
  data: T;
  error: { message: string; code?: string } | null;
}): T {
  if (result.error)
    throw new HttpError(result.error.code === '40001' ? 409 : 400, result.error.message);

  return result.data;
}

export class ContentStore {
  constructor(
    readonly url: string,
    readonly publicKey: string,
  ) {}
  async owner(token: string) {
    if (!token) throw new HttpError(401, 'Sign in to edit content.');
    const client = createClient(this.url, this.publicKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const identity = await client.auth.getUser(token);

    if (identity.error || !identity.data.user || !checked(await client.rpc('portfolio_is_owner')))
      throw new HttpError(403, 'Owner MFA required.');
    if (!checked(await client.rpc('portfolio_owner_rate_limit')))
      throw new HttpError(429, 'Too many requests. Retry next minute.');

    return client;
  }
  async live(): Promise<PortfolioContent> {
    const response = await fetch(this.url + '/functions/v1/public-content', {
      headers: { apikey: this.publicKey },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });

    if (!response.ok) throw new HttpError(503, 'Published content is unavailable.');
    const snapshot = await response.json();
    const content = contentSchema.parse(snapshot);

    if (content.entities.some((e) => e.status !== 'published'))
      throw new HttpError(503, 'Invalid public content.');

    return content;
  }
  async rows(client: SupabaseClient): Promise<ContentRow[]> {
    return (
      checked(
        await client
          .from('portfolio_entities')
          .select('id,kind,status,sort_order,data,version,current_revision')
          .order('sort_order'),
      ) ?? []
    );
  }
  async save(client: SupabaseClient, input: Entity, expectedVersion: number, requestKey: string) {
    const entity = entitySchema.parse(input);
    const replay = checked(
      await client
        .from('portfolio_releases')
        .select('id')
        .eq('request_key', requestKey)
        .maybeSingle(),
    );

    if (replay) {
      const prior = checked(
        await client
          .from('portfolio_revisions')
          .select('id,version,entity')
          .eq('entity_id', entity.id)
          .eq('version', expectedVersion + 1)
          .single(),
      );

      if (!prior) throw new HttpError(409, 'Missing saved revision.');
      if (!isDeepStrictEqual(entitySchema.parse(prior.entity), entity))
        throw new HttpError(409, 'Request key reused for different content.');

      return { version: prior.version, revisionId: prior.id, releaseId: replay.id };
    }
    const [rows, base] = await Promise.all([this.rows(client), this.live()]);
    const existing = rows.find((r) => r.id === entity.id);

    if ((existing?.version ?? 0) !== expectedVersion)
      throw new HttpError(
        409,
        'Someone saved newer changes. Your edits are still here; reload or compare before saving.',
      );
    if (entity.kind === 'media' && existing) {
      for (const field of ['path', 'mime', 'bytes', 'width', 'height', 'publicPath', 'variants']) {
        if (!isDeepStrictEqual(entity.data[field], existing.data[field]))
          throw new HttpError(
            400,
            'Image files are immutable. Upload a replacement and change the image selection.',
          );
      }
    }
    if (
      entity.kind === 'repository' &&
      entity.status !== 'archived' &&
      (!existing ||
        existing.data.fullName !== entity.data.fullName ||
        base.github.excludedIds.includes(Number(entity.data.githubId)))
    ) {
      const response = await fetch(
        `https://api.github.com/repositories/${Number(entity.data.githubId)}`,
        {
          headers: { Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!response.ok) throw new HttpError(400, 'Choose a publicly accessible GitHub repository.');
      const repository = await response.json();

      if (
        repository.private ||
        repository.full_name !== entity.data.fullName ||
        repository.owner?.login !== 'Spatovaliyski'
      )
        throw new HttpError(400, 'Choose a public repository owned by Spatovaliyski.');
      base.github.excludedIds = base.github.excludedIds.filter(
        (id) => id !== Number(entity.data.githubId),
      );
    }
    const required: Partial<Record<Entity['kind'], string[]>> = {
      experience: ['employer', 'role', 'start'],
      project: ['title', 'slug', 'summary', 'ownership'],
      note: ['title', 'slug', 'summary'],
      qualification: ['title'],
      skill: ['label', 'category'],
    };

    for (const field of required[entity.kind] ?? [])
      if (!String(entity.data[field] ?? '').trim())
        throw new HttpError(400, `Enter ${field} before saving.`);
    const selected: Entity[] = [entity];
    // Resolve only this item's dependencies. Unrelated working records never enter a save.
    const visited = new Set([entity.id]);

    for (let i = 0; i < selected.length; i++)
      for (const id of referencedIds(selected[i])) {
        if (visited.has(id) || base.entities.some((e) => e.id === id)) continue;
        const dependency = rows.find((r) => r.id === id && r.status === 'published');

        if (!dependency) throw new HttpError(400, `Choose a saved item for reference ${id}.`);
        visited.add(id);
        selected.push(rowEntity(dependency));
      }
    let snapshot = composeRelease(
      base,
      selected,
      requestKey,
      base.generation + 1,
      new Date().toISOString(),
    );

    if (existing?.kind === 'repository' && entity.status === 'archived')
      snapshot = purgeRepositories(
        snapshot,
        [Number(existing.data.githubId)],
        [{ id: Number(existing.data.githubId), fullName: String(existing.data.fullName) }],
      );
    const errors = validatePublication(snapshot);

    if (errors.length) throw new HttpError(400, errors.join('\n'));
    const release = checked(
      await client
        .from('portfolio_releases')
        .select('revision_manifest')
        .eq('id', base.releaseId)
        .single(),
    );

    if (!release) throw new HttpError(503, 'Missing content version.');
    const manifest = { ...release.revision_manifest };

    for (const dependency of selected.slice(1))
      manifest[dependency.id] = rows.find((r) => r.id === dependency.id)!.current_revision;
    for (const id of Object.keys(manifest))
      if (!snapshot.entities.some((e) => e.id === id)) delete manifest[id];

    return checked(
      await client.rpc('portfolio_save_live', {
        p_entity: entity,
        p_expected_version: expectedVersion,
        p_base: base.releaseId,
        p_snapshot: snapshot,
        p_manifest: manifest,
        p_request_key: requestKey,
      }),
    ) as { version: number; revisionId: string; releaseId: string };
  }
}
