import { handler, machine, service, checked } from '../_shared/http.ts';
import { z } from 'zod';
import { contentSchema, githubSchema, records } from '../../../src/domain/schema.ts';
import { purgeRepositories } from '../../../src/domain/privacy.ts';
import { validatePublication } from '../../../src/domain/publication.ts';

handler(async (request, body) => {
  await machine(request);
  const client = service();
  const status = async () =>
    checked(await client.rpc('portfolio_release_status')) as {
      desiredReleaseId: string | null;
      activeReleaseId: string | null;
    };
  const control = await status();

  if (body.action === 'status') return control;
  if (body.action === 'release') {
    const id = z.uuid().parse(body.releaseId);
    const release = checked(
      await client
        .from('portfolio_releases')
        .select('snapshot,state,generation')
        .eq('id', id)
        .single(),
    );

    if (
      !['approved', 'building', 'failed', 'deployed'].includes(release.state) ||
      id !== control.desiredReleaseId
    )
      throw new Error('Release cannot be built or activated.');
    const content = contentSchema.parse(release.snapshot);
    const paths = records(content, 'media').map((m) => m.path);
    const media = paths.length
      ? checked(await client.storage.from('portfolio-originals').createSignedUrls(paths, 600))
      : [];

    return { content, media, desiredReleaseId: control.desiredReleaseId };
  }
  if (body.action === 'report') {
    const input = z
      .object({
        releaseId: z.uuid(),
        buildId: z.string().max(200),
        state: z.enum(['building', 'deployed', 'failed']),
        error: z.string().max(1000).optional(),
      })
      .parse(body);

    return checked(
      await client.rpc('portfolio_report_deployment', {
        p_id: input.releaseId,
        p_build: input.buildId,
        p_state: input.state,
        p_error: input.error ?? null,
      }),
    );
  }
  if (body.action === 'sync-config') {
    const token = z.uuid().parse(body.token);

    if (!checked(await client.rpc('portfolio_acquire_lock', { p_name: 'github', p_token: token })))
      throw new Error('GitHub synchronization is locked.');
    try {
      const releaseId = control.activeReleaseId ?? control.desiredReleaseId;

      if (!releaseId)
        throw new Error('Publish the initial curated repository configuration first.');
      const release = checked(
        await client.from('portfolio_releases').select('snapshot').eq('id', releaseId).single(),
      );
      const previous = checked(
        await client
          .from('portfolio_github_snapshots')
          .select('payload')
          .order('created_at', { ascending: false })
          .limit(1),
      );
      const job = checked(
        await client
          .from('portfolio_jobs')
          .insert({
            kind: 'github',
            state: 'running',
            lock_token: token,
            config_release_id: releaseId,
          })
          .select('id')
          .single(),
      );

      return {
        repositories: records(contentSchema.parse(release.snapshot), 'repository'),
        previous: previous[0]?.payload ?? null,
        jobId: job.id,
      };
    } catch (error) {
      await client.rpc('portfolio_release_lock', { p_name: 'github', p_token: token });
      throw error;
    }
  }
  if (body.action === 'sync-failure')
    return checked(
      await client.rpc('portfolio_finish_live_sync', {
        p_token: z.uuid().parse(body.token),
        p_job: z.uuid().parse(body.jobId),
        p_snapshot: null,
        p_expected_desired: null,
        p_refresh_snapshot: null,
        p_manifest: {},
        p_error: z.string().max(1000).parse(body.error),
      }),
    );
  if (body.action === 'sync-result') {
    const token = z.uuid().parse(body.token);
    const jobId = z.uuid().parse(body.jobId);
    const snapshot = githubSchema.parse(body.snapshot);
    const job = checked(
      await client
        .from('portfolio_jobs')
        .select('config_release_id')
        .eq('id', jobId)
        .eq('lock_token', token)
        .eq('state', 'running')
        .single(),
    );
    const configuration = contentSchema.parse(
      checked(
        await client
          .from('portfolio_releases')
          .select('snapshot')
          .eq('id', job.config_release_id)
          .single(),
      ).snapshot,
    );
    const allowlist = new Set(records(configuration, 'repository').map((repo) => repo.githubId));

    if (snapshot.repositories.some((repo) => !allowlist.has(repo.id)))
      throw new Error('Repository is outside the approved allowlist');
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await status();

      if (!current.desiredReleaseId) throw new Error('No approved configuration');
      const desired = checked(
        await client
          .from('portfolio_releases')
          .select('snapshot,revision_manifest')
          .eq('id', current.desiredReleaseId)
          .single(),
      );
      const base = contentSchema.parse(desired.snapshot);
      const refresh = true;
      // Purge before replacing GitHub data so removed repository names remain available for link redaction.
      const purged = purgeRepositories(base, snapshot.excludedIds);
      const next = contentSchema.parse({
        ...purged,
        generatedAt: new Date().toISOString(),
        github: {
          ...snapshot,
          repositories: snapshot.repositories.filter((repo) =>
            records(purged, 'repository').some((r) => r.githubId === repo.id),
          ),
        },
      });
      const manifest = Object.fromEntries(
        Object.entries(desired.revision_manifest).filter(([id]) =>
          next.entities.some((e) => e.id === id),
        ),
      );

      if (refresh) {
        const errors = validatePublication(next);

        if (errors.length) throw new Error(errors.join('\n'));
      }
      const result = await client.rpc('portfolio_finish_sync', {
        p_token: token,
        p_job: jobId,
        p_snapshot: snapshot,
        p_expected_desired: current.desiredReleaseId,
        p_refresh_snapshot: refresh ? next : null,
        p_manifest: manifest,
      });

      if (result.error?.code === '40001' && attempt < 2) continue;
      const committed = checked(result);

      return committed;
    }
  }
  throw new Error('Unsupported machine action');
});
