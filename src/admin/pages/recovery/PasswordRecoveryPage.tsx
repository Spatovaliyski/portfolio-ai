import { PasswordForm } from './components/PasswordForm.tsx';
import type { AdminWorkspace } from '../../useAdminWorkspace.ts';

export function PasswordRecoveryPage({ workspace }: { workspace: AdminWorkspace }) {
  const { error } = workspace;

  return (
    <main className="admin-auth">
      <h1>Set your password</h1>
      <p>
        Use at least 12 characters. Then enroll an authenticator and keep its recovery procedure
        safe.
      </p>
      <PasswordForm workspace={workspace} />
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
