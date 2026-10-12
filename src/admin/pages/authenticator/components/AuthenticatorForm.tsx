import type { AdminWorkspace } from '../../../useAdminWorkspace.ts';
import { Button } from '../../../../public/components/ui/Button.tsx';

export function AuthenticatorForm({ workspace }: { workspace: AdminWorkspace }) {
  const { run, verify, factor, code, setCode, busy } = workspace;

  if (!factor) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(verify);
      }}
    >
      {factor.qr && (
        <>
          <img className="totp-qr" src={factor.qr} alt="Authenticator enrollment QR code" />
          <p>
            Scan this in your authenticator. Keep a trusted recovery path in Supabase before
            continuing.
          </p>
        </>
      )}
      <label>
        Six-digit code
        <input
          inputMode="numeric"
          pattern="[0-9]{6}"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </label>
      <Button type="submit" disabled={busy}>
        Verify code
      </Button>
    </form>
  );
}
