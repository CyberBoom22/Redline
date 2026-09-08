import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Gauge, Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { AdminShell } from './AdminShell';

export const AdminLogin: React.FC = () => {
  const { session, isAdmin, loading, configError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        setError(signInError.message);
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
              Redline Operations
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
      </form>
    </AdminShell>
  );
};
