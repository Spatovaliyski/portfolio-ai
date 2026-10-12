import { useAdminWorkspace } from './useAdminWorkspace.ts';
import { LoginPage } from './pages/login/LoginPage.tsx';
import { PasswordRecoveryPage } from './pages/recovery/PasswordRecoveryPage.tsx';
import { AuthenticatorPage } from './pages/authenticator/AuthenticatorPage.tsx';
import { AdminShell } from './components/AdminShell.tsx';

export function AdminApp() {
  const workspace = useAdminWorkspace();

  if (!workspace.session) return <LoginPage workspace={workspace} />;
  if (workspace.recovery) return <PasswordRecoveryPage workspace={workspace} />;
  if (!workspace.aal) return <AuthenticatorPage workspace={workspace} />;

  return <AdminShell workspace={workspace} />;
}
