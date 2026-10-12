import { DraftPreview } from '../../../Preview.tsx';
import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';

export function PreviewPanel({ workspace }: { workspace: AdminWorkspace }) {
  const { previewWidth, setPreviewWidth, setPreview, previewContent, previewPath, previewError } =
    workspace;

  return (
    <section className="private-preview">
      <header>
        <h2>Private draft preview</h2>
        <label>
          Viewport
          <select value={previewWidth} onChange={(e) => setPreviewWidth(e.target.value)}>
            <option value="375px">Mobile</option>
            <option value="768px">Tablet</option>
            <option value="100%">Desktop</option>
          </select>
        </label>
        <button onClick={() => setPreview(false)}>Close preview</button>
      </header>
      <div className="preview-viewport">
        {previewContent ? (
          <DraftPreview content={previewContent} initialPath={previewPath} width={previewWidth} />
        ) : (
          <pre role="alert">{previewError}</pre>
        )}
      </div>
    </section>
  );
}
