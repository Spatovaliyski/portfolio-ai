import { AuthenticatorForm } from './components/AuthenticatorForm.tsx';
import type { AdminWorkspace } from '../../useAdminWorkspace.ts';

export function AuthenticatorPage({ workspace }: { workspace: AdminWorkspace }) {
  const { factor, busy, run, enroll, signOut, error } = workspace;

  return (
    <main className="admin-auth">
      <span className="eyebrow">Owner security</span>
      <h1>Authenticator verification</h1>
      <p>Content remains locked until two-factor verification succeeds.</p>
      {!factor ? (
        <button className="button" disabled={busy} onClick={() => run(enroll)}>
          Set up or verify authenticator
        </button>
      ) : (
        <AuthenticatorForm workspace={workspace} />
      )}
      <button className="quiet" onClick={signOut}>
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
