import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Gauge, Loader2, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
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
        <div className="flex items-center justify-center gap-2 py-6 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-widest">Checking</span>
        </div>
      </AdminShell>
    );
  }

  if (alreadyClaimed) {
    return (
      <AdminShell title="Administrator registration" configError={configError}>
        <div className="space-y-3 text-center py-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-slate-200">
            Registration is closed
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This deployment already has its administrator. There is exactly one, and the slot cannot be
            claimed again.
          </p>
          <a
            href="/admin/login"
            className="inline-block text-xs font-mono uppercase tracking-widest text-red-400 hover:text-red-300"
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
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center ring-1 ring-red-500/30">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm uppercase tracking-wider text-white">
              Claim administrator
            </div>
            <p className="text-xs text-slate-400">This can be done once, and only once.</p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-red-500/70 focus:outline-none rounded-lg px-3 py-2 text-sm text-slate-100"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Password</span>
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-red-500/70 focus:outline-none rounded-lg px-3 py-2 text-sm text-slate-100"
          />
          <span className="block text-[10px] text-slate-500">At least {MIN_PASSWORD_LENGTH} characters.</span>
        </label>

        {error && (
          <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/70 rounded-lg px-3 py-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          </div>
        )}
        {notice && (
          <div className="bg-amber-950/40 border border-amber-800/70 rounded-lg px-3 py-2.5">
            <p className="text-xs text-amber-200 leading-relaxed">{notice}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-widest rounded-lg px-4 py-2.5 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {busy ? 'Creating' : 'Create administrator'}
        </button>
      </form>
    </AdminShell>
  );
};
