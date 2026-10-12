import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';

export function EditorToolbar({ workspace }: { workspace: AdminWorkspace }) {
  const { saveStatus, busy, discardChanges, setPreview, preview, autosave, setAutosave } =
    workspace;

  return (
    <div className="editor-toolbar">
      <p role="status">{saveStatus}</p>
      <button className="button" disabled={busy}>
        Save
      </button>
      <button type="button" disabled={saveStatus === 'Saving…'} onClick={discardChanges}>
        Discard changes
      </button>
      <button type="button" onClick={() => setPreview(!preview)}>
        {preview ? 'Close preview' : 'Preview draft'}
      </button>
      <label className="checkbox">
        <input type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} />
        Autosave
      </label>
    </div>
  );
}
