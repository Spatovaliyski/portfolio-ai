import type { AdminWorkspace } from '../../useAdminWorkspace.ts';
import { RecordList } from './components/RecordList.tsx';
import { EntityEditor } from './components/EntityEditor.tsx';

export function EditorPage({ workspace }: { workspace: AdminWorkspace }) {
  const { editing } = workspace;

  return (
    <div className="admin-editor-layout">
      <RecordList workspace={workspace} />
      {editing && <EntityEditor workspace={workspace} />}
    </div>
  );
}
