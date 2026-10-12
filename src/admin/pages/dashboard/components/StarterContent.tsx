import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';

export function StarterContent({ workspace }: { workspace: AdminWorkspace }) {
  const { busy, run, bootstrap } = workspace;

  return (
    <section className="admin-panel">
      <h2>Start with verified public evidence</h2>
      <p>
        Import the starter records as private drafts. Review career dates, case-study decisions,
        media rights, and the current CV before publishing.
      </p>
      <button className="button" disabled={busy} onClick={() => run(bootstrap)}>
        Import starter drafts
      </button>
    </section>
  );
}
