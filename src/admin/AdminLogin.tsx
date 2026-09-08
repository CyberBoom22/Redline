import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Gauge, Loader2, LogIn, ShieldAlert } from 'lucide-react';
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
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center ring-1 ring-red-500/30">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm uppercase tracking-wider text-white">
              Stage0 Operations
            </div>
            <p className="text-xs text-slate-400">Scrape reporting — administrator only</p>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-red-500/70 focus:outline-none rounded-lg px-3 py-2 text-sm text-slate-100"
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/70 rounded-lg px-3 py-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-widest rounded-lg px-4 py-2.5 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {busy ? 'Signing in' : 'Sign in'}
        </button>

        {slotOpen && (
          <p className="text-center pt-1">
            <Link
              to="/admin/register"
              className="text-[11px] font-mono uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors"
            >
              Set up the administrator account
            </Link>
          </p>
        )}
      </form>
    </AdminShell>
  );
};
