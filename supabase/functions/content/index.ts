import { handler, owner, service, checked, dispatch } from '../_shared/http.ts';
import { entitySchema } from '../../../src/domain/schema.ts';
import { validTheme } from '../../../src/domain/publication.ts';

handler(async (request, body) => {
  const { client } = await owner(request);

  if (body.action === 'list')
    return {
      entities: checked(await client.from('portfolio_entities').select('*').order('sort_order')),
      releases: checked(
        await client
          .from('portfolio_releases')
          .select('id,generation,state,build_id,failure,created_at,deployed_at,revision_manifest')
          .order('generation', { ascending: false })
          .limit(30),
      ),
      jobs: checked(
        await client
          .from('portfolio_jobs')
          .select('id,kind,state,started_at,finished_at,error')
          .order('started_at', { ascending: false })
          .limit(20),
      ),
      control: checked(await service().rpc('portfolio_release_status')),
      github:
        checked(
          await client
            .from('portfolio_github_snapshots')
            .select('payload,created_at')
            .order('created_at', { ascending: false })
            .limit(1),
        )[0] ?? null,
    };
  if (body.action === 'release')
    return checked(
      await client
        .from('portfolio_releases')
        .select('snapshot,revision_manifest')
        .eq('id', String(body.releaseId))
        .single(),
    );
  if (body.action === 'history')
    return {
      revisions: checked(
        await client
          .from('portfolio_revisions')
          .select('*')
          .eq('entity_id', String(body.entityId))
          .order('version', { ascending: false })
          .limit(50),
      ),
    };
  if (body.action === 'references')
    return {
      references: checked(
        await client
          .from('portfolio_entity_links')
          .select('source_id')
          .eq('target_id', String(body.entityId)),
      ),
    };
  if (body.action === 'save') {
    const entity = entitySchema.parse(body.entity);

    if (
      entity.kind === 'settings' &&
      !validTheme(entity.data.theme as { canvas: string; ink: string; accent: string })
    )
      throw new Error('Theme copy, accents and actions must meet 4.5:1 contrast.');
    if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 0)
      throw new Error('Expected revision version required');

    return checked(
      await client.rpc('portfolio_save_entity', {
        p_entity: entity,
        p_expected_version: body.expectedVersion,
      }),
    );
  }
  if (body.action === 'sync') {
    await dispatch('', 'github-sync.yml');

    return { queued: true };
  }
  throw new Error('Unsupported content action');
});
