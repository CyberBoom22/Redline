import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { AdminBrand } from './AdminBrand';
import { requireSupabase, supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { AdminShell } from './AdminShell';

export const AdminLogin: React.FC = () => {
  const { session, isAdmin, loading, configError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The registration link appears only while the single admin slot is unclaimed,
  // so first-time setup is findable and the path disappears permanently after.
  // admin_exists() returns a boolean and nothing else -- it cannot reveal who
  // the administrator is.
  const [slotOpen, setSlotOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.rpc('admin_exists').then(({ data, error: rpcError }) => {
      // Fail closed: an unreachable database must not advertise registration.
      if (!cancelled) setSlotOpen(!rpcError && data === false);
    });
    return () => { cancelled = true; };
  }, []);

  if (!loading && session && isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: signInError } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        // One message for every cause. "No such account" versus "wrong
        // password" tells an attacker which emails are registered.
        setError('Sign in failed. Check the email and password and try again.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell title="Administrator sign in" configError={configError}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AdminBrand title="Stage0 Operations" subtitle="Scrape reporting — administrator only" />

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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>

        {error && (
          <div role="alert" className="well flex items-start gap-2 border-accent px-3 py-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" aria-hidden="true" />
            <p className="text-[15px] text-text-2">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary btn-sm w-full"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Signing in' : 'Sign in'}
        </button>

        {slotOpen && (
          <p className="text-center">
            <Link
              to="/admin/register"
              className="link text-[14px] uppercase tracking-[1px] text-text-2 hover:text-ink"
            >
              Set up the administrator account
            </Link>
          </p>
        )}
      </form>
    </AdminShell>
  );
};
