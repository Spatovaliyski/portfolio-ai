import { handler, owner, service, checked, dispatch } from '../_shared/http.ts';
import { z } from 'zod';
import {
  contentSchema,
  entitySchema,
  githubSchema,
  records,
  type PortfolioContent,
} from '../../../src/domain/schema.ts';
import { composeRelease, validatePublication } from '../../../src/domain/publication.ts';
import { excludedReferences, purgeRepositories } from '../../../src/domain/privacy.ts';

const requestSchema = z
  .object({
    action: z.enum(['publish', 'retry', 'rollback']),
    baseReleaseId: z.uuid().nullable(),
    requestKey: z.uuid(),
    revisionIds: z.array(z.uuid()).max(500).default([]),
    releaseId: z.uuid().optional(),
  })
  .strict();

handler(async (request, input) => {
  const { user } = await owner(request);
  const body = requestSchema.parse(input);
  const client = service();
  const control = checked(await client.rpc('portfolio_release_status')) as {
    desiredReleaseId: string | null;
    activeReleaseId: string | null;
  };
  const repeated = checked(
    await client
      .from('portfolio_releases')
      .select('id,generation,state')
      .eq('request_key', body.requestKey)
      .maybeSingle(),
  );

  if (repeated) return repeated;
  if (body.action === 'retry') {
    if (body.releaseId !== control.desiredReleaseId)
      throw new Error('Only the current desired release can be retried.');
    const release = checked(
      await client.from('portfolio_releases').select('state').eq('id', body.releaseId!).single(),
    );

    if (release.state === 'invalidated')
      throw new Error('Privacy-invalidated release cannot be retried.');
    await dispatch(body.releaseId!);

    return { releaseId: body.releaseId, state: 'approved' };
  }
  let base: PortfolioContent = {
    schemaVersion: 1,
    releaseId: 'empty',
    generation: 0,
    generatedAt: new Date().toISOString(),
    entities: [],
    github: {
      account: 'Spatovaliyski',
      fetchedAt: null,
      repositories: [],
      errors: [],
      excludedIds: [],
    },
  };
  let manifest: Record<string, string> = {};

  if (body.baseReleaseId) {
    const previous = checked(
      await client
        .from('portfolio_releases')
        .select('snapshot,revision_manifest')
        .eq('id', body.baseReleaseId)
        .single(),
    );

    base = contentSchema.parse(previous.snapshot);
    manifest = previous.revision_manifest;
  }
  let snapshot: PortfolioContent;

  if (body.action === 'rollback') {
    const target = checked(
      await client
        .from('portfolio_releases')
        .select('snapshot,revision_manifest,state')
        .eq('id', body.releaseId!)
        .single(),
    );

    if (target.state !== 'deployed')
      throw new Error('Only retained deployed releases can be restored.');
    snapshot = contentSchema.parse(target.snapshot);
    manifest = target.revision_manifest;
  } else {
    if (!body.revisionIds.length) throw new Error('Select the revisions to publish.');
    const revisions = checked(
      await client.from('portfolio_revisions').select('id,entity').in('id', body.revisionIds),
    );

    if (revisions.length !== body.revisionIds.length)
      throw new Error('Selected revisions are missing or repeated.');
    const entities = revisions.map((revision) => entitySchema.parse(revision.entity));

    if (new Set(entities.map((e) => e.id)).size !== entities.length)
      throw new Error('Select one revision per entity.');
    revisions.forEach((revision, i) => {
      if (entities[i].status === 'archived') delete manifest[entities[i].id];
      else manifest[entities[i].id] = revision.id;
    });
    snapshot = composeRelease(
      base,
      entities.map((e) => ({ ...e, status: e.status === 'archived' ? 'archived' : 'published' })),
      crypto.randomUUID(),
      0,
      new Date().toISOString(),
    );
    manifest = Object.fromEntries(
      Object.entries(manifest).filter(([id]) => snapshot.entities.some((e) => e.id === id)),
    );
    const github = checked(
      await client
        .from('portfolio_github_snapshots')
        .select('payload')
        .order('created_at', { ascending: false })
        .limit(1),
    );

    if (github[0]) {
      snapshot.github = githubSchema.parse(github[0].payload);
      const allowed = snapshot.entities
        .filter((e) => e.kind === 'repository')
        .map((e) => Number(e.data.githubId));

      snapshot.github.repositories = snapshot.github.repositories.filter((repo) =>
        allowed.includes(repo.id),
      );
    }
    const retired = records(base, 'repository').filter(
      (repo) => !records(snapshot, 'repository').some((next) => next.githubId === repo.githubId),
    );

    snapshot = purgeRepositories(
      snapshot,
      retired.map((repo) => repo.githubId),
      retired.map((repo) => ({ id: repo.githubId, fullName: repo.fullName })),
    );
  }
  const latestGitHub = checked(
    await client
      .from('portfolio_github_snapshots')
      .select('payload')
      .order('created_at', { ascending: false })
      .limit(1),
  );
  const excluded: number[] = latestGitHub[0]?.payload.excludedIds ?? [];
  const verified: number[] = [];

  if (body.action === 'publish')
    for (const repo of records(snapshot, 'repository').filter(
      (repo) =>
        excluded.includes(repo.githubId) ||
        !records(base, 'repository').some((old) => old.githubId === repo.githubId),
    )) {
      const response = await fetch(`https://api.github.com/repositories/${repo.githubId}`, {
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok)
        throw new Error(
          `Cannot verify newly selected repository ${repo.fullName} (${response.status}). Existing public HTML remains available.`,
        );
      const metadata = await response.json();

      if (
        metadata.private ||
        metadata.visibility !== 'public' ||
        metadata.full_name?.toLowerCase() !== repo.fullName.toLowerCase()
      )
        throw new Error(
          `Verify public visibility and canonical repository name for ${repo.fullName}.`,
        );
      verified.push(repo.githubId);
    }
  snapshot.github.excludedIds = snapshot.github.excludedIds.filter((id) => !verified.includes(id));
  if (
    excludedReferences(
      snapshot,
      excluded.filter((id) => !verified.includes(id)),
    )
  )
    throw new Error(
      'Release contains a removed/private repository. Rebuild its content before rollback.',
    );
  const errors = validatePublication(snapshot, true);

  if (errors.length) throw new Error(errors.join('\n'));
  for (const entity of snapshot.entities.filter((e) => e.kind === 'media')) {
    const { data, error } = await client.storage
      .from('portfolio-originals')
      .createSignedUrl(String(entity.data.path), 60);

    if (error || !data) throw new Error(`Upload the private original for ${entity.id}.`);
    const response = await fetch(data.signedUrl, { method: 'HEAD' });

    if (!response.ok) throw new Error(`Missing private original for ${entity.id}.`);
  }
  const result = checked(
    await client.rpc('portfolio_create_release', {
      p_request_key: body.requestKey,
      p_base: body.baseReleaseId,
      p_snapshot: snapshot,
      p_manifest: manifest,
      p_rollback: body.action === 'rollback' ? body.releaseId : null,
    }),
  );

  checked(
    await client
      .from('portfolio_audit')
      .insert({ actor: user.id, action: 'publication_requested', release_id: result.id }),
  );
  try {
    await dispatch(result.id);
  } catch (error) {
    checked(
      await client.rpc('portfolio_report_deployment', {
        p_id: result.id,
        p_build: 'dispatch',
        p_state: 'failed',
        p_error: (error as Error).message,
      }),
    );

    return { releaseId: result.id, state: 'failed', error: (error as Error).message };
  }

  return { releaseId: result.id, generation: result.generation, state: result.state };
});
