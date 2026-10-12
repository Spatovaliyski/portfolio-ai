import { LoginForm } from './components/LoginForm.tsx';
import type { AdminWorkspace } from '../../useAdminWorkspace.ts';

export function LoginPage({ workspace }: { workspace: AdminWorkspace }) {
  const { run, recoverAccess, saveStatus, error } = workspace;

  return (
    <main className="admin-auth">
      <a href="/" className="admin-home">
        ← Public portfolio
      </a>
      <span className="eyebrow">Private workspace</span>
      <h1>Portfolio editor</h1>
      <p>Sign in to edit, preview, and publish.</p>
      <LoginForm workspace={workspace} />
      <button className="quiet" onClick={() => run(recoverAccess)}>
        Recover access
      </button>
      {saveStatus && <p role="status">{saveStatus}</p>}
      {error && (
        <pre role="alert" className="admin-error">
          {error}
        </pre>
      )}
    </main>
  );
}
