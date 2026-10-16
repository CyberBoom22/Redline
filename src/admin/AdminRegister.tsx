import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
import { AdminBrand } from './AdminBrand';
import { requireSupabase, supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { AdminShell } from './AdminShell';

/**
 * One-time administrator registration.
 *
 * The closed state below is presentation. The guarantee is claim_admin(), which
 * inserts only into an empty table and raises otherwise — so someone who finds
 * this page after the slot is taken gets an ordinary account with no admin
 * rights, and RLS shows them nothing.
 */
const MIN_PASSWORD_LENGTH = 12;

export const AdminRegister: React.FC = () => {
  const { session, isAdmin, loading, configError, refreshAdmin } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    supabase.rpc('admin_exists').then(({ data, error: rpcError }) => {
      if (cancelled) return;
      // On error, assume the slot is taken. Failing closed on an unreachable
      // database is safer than rendering an open registration form.
      setAlreadyClaimed(rpcError ? true : data === true);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && session && isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    const client = requireSupabase();
    try {
      // Enforced here on top of the project-level setting, so a misconfigured
      // project cannot accept a weak administrator password.
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }

      const { data, error: signUpError } = await client.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) {
        // Generic on purpose: "User already registered" would confirm which
        // addresses exist on this project.
        setError('Could not create the account. Check the email and password and try again.');
        return;
      }

      // claim_admin() needs an authenticated caller. With email confirmation
      // enabled, signUp returns no session and there is nobody to claim as.
      if (!data.session) {
        setNotice(
          'Account created, but Supabase returned no session because email confirmation is enabled. ' +
            'Turn off "Confirm email" under Authentication → Providers → Email, then sign in and reload ' +
            'this page to claim the administrator slot.',
        );
        return;
      }

      const { error: claimError } = await client.rpc('claim_admin');
      if (claimError) {
        // The slot was taken between the page loading and this submit. The
        // account exists but has no rights, so do not leave it signed in.
        await client.auth.signOut();
        setAlreadyClaimed(true);
        setError('An administrator already exists.');
        return;
      }

      await refreshAdmin();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <AdminShell title="Administrator registration" configError={configError}>
        <div className="flex items-center justify-center gap-2 py-6 text-text-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span className="label-ui">Checking</span>
        </div>
      </AdminShell>
    );
  }

  if (alreadyClaimed) {
    return (
      <AdminShell title="Administrator registration" configError={configError}>
        <div className="space-y-3 text-center py-2">
          <ShieldCheck className="mx-auto h-6 w-6 text-text-3" aria-hidden="true" />
          <h2 className="h-section etch text-ink">
            Registration is closed
          </h2>
          <p className="text-[15px] text-text-2">
            This deployment already has its administrator. There is exactly one, and the slot cannot be
            claimed again.
          </p>
          <a
            href="/admin/login"
            className="btn btn-secondary btn-sm"
          >
            Go to sign in
          </a>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Administrator registration" configError={configError}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AdminBrand title="Claim administrator" subtitle="This can be done once, and only once." />

        <label className="block">
          <span className="field-label">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>

        <label className="block">
          <span className="field-label">Password</span>
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
          <span className="mt-1 block text-[14px] text-text-2">At least {MIN_PASSWORD_LENGTH} characters.</span>
        </label>

        {error && (
          <div role="alert" className="well flex items-start gap-2 border-accent px-3 py-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" aria-hidden="true" />
            <p className="text-[15px] text-text-2">{error}</p>
          </div>
        )}
        {notice && (
          <div role="status" className="well px-3 py-2.5">
            <p className="text-[15px] text-text-2">{notice}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary btn-sm w-full"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Creating' : 'Create administrator'}
        </button>
      </form>
    </AdminShell>
  );
};
