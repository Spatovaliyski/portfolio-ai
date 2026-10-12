import { titleCase } from './fields/fieldValues.ts';
import { type EntityKind } from '../../../../domain/schema.ts';
import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';

export function RecordList({ workspace }: { workspace: AdminWorkspace }) {
  const { busy, create, kind, section, run, upload, rows, editing, open } = workspace;

  return (
    <aside className="record-list">
      <button className="button" disabled={busy} onClick={() => create(kind as EntityKind)}>
        New {titleCase(kind)}
      </button>
      {section === 'media' && (
        <label className="upload">
          Upload a private original
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) run(() => upload(file));
            }}
          />
        </label>
      )}
      {rows.map((row) => (
        <button
          className={editing?.id === row.id ? 'selected' : ''}
          key={row.id}
          onClick={() => open(row)}
        >
          <strong>
            {String(
              row.data.title ?? row.data.name ?? row.data.employer ?? row.data.label ?? row.id,
            )}
          </strong>
          <small>
            v{row.version} · {row.status}
          </small>
        </button>
      ))}
    </aside>
  );
}
