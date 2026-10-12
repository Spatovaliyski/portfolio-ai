import type { AdminWorkspace } from '../useAdminWorkspace.ts';
import { PreviewPanel } from '../pages/editor/components/PreviewPanel.tsx';
import { EditorPage } from '../pages/editor/EditorPage.tsx';
import { DashboardPage } from '../pages/dashboard/DashboardPage.tsx';
import { sections } from '../model.ts';

export function AdminShell({ workspace }: { workspace: AdminWorkspace }) {
  const { section, chooseSection, signOut, error, preview, editing } = workspace;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          ms<span>.</span> editor
        </a>
        <nav aria-label="Editor">
          {sections.map(([label, value]) => (
            <button
              key={value}
              className={section === value ? 'active' : ''}
              onClick={() => chooseSection(value)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button onClick={signOut}>Sign out</button>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <div>
            <span className="eyebrow">Owner workspace</span>
            <h1>{sections.find(([, value]) => value === section)?.[0]}</h1>
          </div>
          <a href="/" className="text-link">
            View portfolio ↗
          </a>
        </header>
        {error && (
          <pre className="admin-error" role="alert" tabIndex={-1}>
            {error}
          </pre>
        )}
        {section === 'dashboard' ? (
          <DashboardPage workspace={workspace} />
        ) : (
          <EditorPage workspace={workspace} />
        )}
        {preview && editing && <PreviewPanel workspace={workspace} />}
      </main>
    </div>
  );
}
