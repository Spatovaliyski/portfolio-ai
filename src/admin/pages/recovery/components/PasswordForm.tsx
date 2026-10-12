import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';
import { Button } from '../../../../public/components/ui/Button.tsx';

export function PasswordForm({ workspace }: { workspace: AdminWorkspace }) {
  const { run, saveRecoveryPassword, password, setPassword, busy } = workspace;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(saveRecoveryPassword);
      }}
    >
      <label>
        New password
        <input
          type="password"
          minLength={12}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <Button type="submit" disabled={busy}>
        Save password
      </Button>
    </form>
  );
}
