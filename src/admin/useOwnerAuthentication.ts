import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './api.ts';

export function useOwnerAuthentication() {
  const [session, setSession] = useState<Session | null>(null);
  const [aal, setAal] = useState(false);
  const [factor, setFactor] = useState<{ id: string; qr: string } | null>(null);
  const [email, setEmail] = useState('martinspatovaliyski@gmail.com');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setAal(false);

      return;
    }
    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => setAal(data?.currentLevel === 'aal2'));
  }, [session]);

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
    setPassword('');
  }

  async function enroll() {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const existing = factors?.totp.find((item) => item.status === 'verified');

    if (existing) {
      setFactor({ id: existing.id, qr: '' });

      return;
    }
    // Clean up only incomplete enrollment attempts for this authenticated owner.
    for (const item of factors?.all.filter(
      (item) => item.factor_type === 'totp' && item.status === 'unverified',
    ) ?? [])
      await supabase.auth.mfa.unenroll({ factorId: item.id });
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Portfolio editor',
    });

    if (error) throw error;
    setFactor({ id: data.id, qr: data.totp.qr_code });
  }

  async function verify() {
    if (!factor) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });

    if (error) throw error;
    setCode('');
    setAal(true);
    await supabase.auth.refreshSession();
  }

  async function recoverAccess() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + '/admin/',
    });

    if (error) throw error;
  }

  async function saveRecoveryPassword() {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) throw error;

    setPassword('');
    setRecovery(false);
  }

  function signOut() {
    return supabase.auth.signOut();
  }

  return {
    session,
    aal,
    factor,
    email,
    password,
    code,
    recovery,
    setEmail,
    setPassword,
    setCode,
    signIn,
    enroll,
    verify,
    recoverAccess,
    saveRecoveryPassword,
    signOut,
  };
}
