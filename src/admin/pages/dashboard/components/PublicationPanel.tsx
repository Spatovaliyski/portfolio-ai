import { ReleaseReview } from '../../../ReleaseReview.tsx';
import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';
import { rowEntity } from '../../../model.ts';

export function PublicationPanel({ workspace }: { workspace: AdminWorkspace }) {
  const { dashboard, selected, setPicked, picked, setSelected, busy, run, publish } = workspace;

  return (
    <section className="admin-panel">
      <h2>Publication</h2>
      <p>Select exactly the saved revisions you want to publish. Unselected drafts stay private.</p>
      <div className="publish-select">
        {dashboard.entities.map((row) => (
          <label key={row.id} className="checkbox">
            <input
              type="checkbox"
              checked={selected.includes(row.current_revision)}
              onChange={(e) => {
                setPicked({ ...picked, [row.current_revision]: rowEntity(row) });
                setSelected(
                  e.target.checked
                    ? [...selected, row.current_revision]
                    : selected.filter((id) => id !== row.current_revision),
                );
              }}
            />
            {String(row.data.title ?? row.data.name ?? row.id)}{' '}
            <small>
              v{row.version} · {row.status}
            </small>
          </label>
        ))}
      </div>
      {selected
        .filter((id) => !dashboard.entities.some((row) => row.current_revision === id))
        .map((id) => (
          <p key={id}>
            Selected earlier revision of {picked[id]?.id}.{' '}
            <button onClick={() => setSelected(selected.filter((value) => value !== id))}>
              Unselect this revision
            </button>
          </p>
        ))}
      <p>
        Active release: {dashboard.control.activeReleaseId ?? 'None'}. GitHub fetched:{' '}
        {dashboard.github?.created_at ?? 'Never'}.
      </p>
      <ReleaseReview
        baseReleaseId={dashboard.control.desiredReleaseId}
        entities={selected.map((id) => picked[id]).filter(Boolean)}
      />
      <button
        className="button"
        disabled={busy || !selected.length}
        onClick={() => run(() => publish('publish'))}
      >
        Validate & publish {selected.length} revisions
      </button>
    </section>
  );
}
