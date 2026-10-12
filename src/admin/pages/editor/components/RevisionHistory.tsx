import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';

export function RevisionHistory({ workspace }: { workspace: AdminWorkspace }) {
  const { run, history, editing, loadRevisionHistory, change } = workspace;

  if (!editing) return null;

  return (
    <div className="revision-history">
      <button type="button" onClick={() => run(loadRevisionHistory)}>
        Load revision history
      </button>
      {history.map((revision) => (
        <button type="button" key={revision.id} onClick={() => change(revision.entity)}>
          Restore v{revision.version} into a new draft
        </button>
      ))}
    </div>
  );
}
