import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';

export function ReleaseHistory({ workspace }: { workspace: AdminWorkspace }) {
  const { dashboard, busy, run, publish } = workspace;

  return (
    <section className="admin-panel">
      <h2>Release history</h2>
      {dashboard.releases.map((release) => (
        <article className="release-row" key={release.id}>
          <div>
            <strong>
              Release {release.generation} · {release.state}
            </strong>
            <p>{release.id}</p>
            {release.failure && <p className="notice">{release.failure}</p>}
          </div>
          {release.state === 'failed' && (
            <button disabled={busy} onClick={() => run(() => publish('retry', release.id))}>
              Retry
            </button>
          )}
          {release.state === 'deployed' && (
            <button disabled={busy} onClick={() => run(() => publish('rollback', release.id))}>
              Restore this release
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
