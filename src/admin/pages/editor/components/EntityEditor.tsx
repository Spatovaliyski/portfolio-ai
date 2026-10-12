import { BlockEditor } from './BlockEditor.tsx';
import { FieldEditor } from './fields/FieldEditor.tsx';
import { titleCase } from './fields/fieldValues.ts';
import { type Entity, type ContentBlock } from '../../../../domain/schema.ts';
import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';
import { EditorToolbar } from './EditorToolbar.tsx';
import { RevisionHistory } from './RevisionHistory.tsx';

export function EntityEditor({ workspace }: { workspace: AdminWorkspace }) {
  const { run, save, editing, change, references, error, loadCurrentRevision } = workspace;

  if (!editing) return null;

  return (
    <form
      className="entity-editor"
      onSubmit={(e) => {
        e.preventDefault();
        run(save);
      }}
    >
      <EditorToolbar workspace={workspace} />
      <label>
        Publication intent
        <select
          value={editing.status}
          onChange={(e) => change({ ...editing, status: e.target.value as Entity['status'] })}
        >
          <option value="draft">Draft</option>
          <option value="published">Ready for publication</option>
          <option value="archived">Archive in the next selected publication</option>
        </select>
      </label>
      <label>
        Sort order
        <input
          type="number"
          value={editing.sortOrder}
          onChange={(e) => change({ ...editing, sortOrder: Number(e.target.value) })}
        />
      </label>
      <p className="record-id">Record ID: {editing.id}</p>
      {Object.entries(editing.data)
        .filter(([key]) => !['blocks', 'publicPath', 'variants'].includes(key))
        .map(([key, value]) => (
          <FieldEditor
            key={key}
            label={titleCase(key)}
            value={value as Parameters<typeof FieldEditor>[0]['value']}
            path={key}
            onChange={(next) => change({ ...editing, data: { ...editing.data, [key]: next } })}
          />
        ))}
      {'blocks' in editing.data && (
        <BlockEditor
          blocks={editing.data.blocks as ContentBlock[]}
          onChange={(blocks) => change({ ...editing, data: { ...editing.data, blocks } })}
        />
      )}
      {editing.kind === 'media' && (
        <p>
          Current references: {references.join(', ') || 'None'}. Originals are immutable. Upload a
          replacement as a new asset, then update references. Previous releases keep their original
          file.
        </p>
      )}
      {/conflict/i.test(error) && (
        <div className="notice">
          <p>Your local changes are still in the editor. Copy or compare them before reloading.</p>
          <button type="button" onClick={() => run(loadCurrentRevision)}>
            Discard local edits and load current revision
          </button>
        </div>
      )}
      <RevisionHistory workspace={workspace} />
    </form>
  );
}
