import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';
import { Button } from '../../../../public/components/ui/Button.tsx';

export function LoginForm({ workspace }: { workspace: AdminWorkspace }) {
  const { run, signIn, email, setEmail, password, setPassword, busy } = workspace;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(signIn);
      }}
    >
      <label>
        Email
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <Button type="submit" disabled={busy}>
        Sign in ↗
      </Button>
    </form>
  );
}
