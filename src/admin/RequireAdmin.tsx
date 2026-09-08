import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

/**
 * Route guard for /admin.
 *
 * This is the second layer. Row Level Security is the first: even if this
 * component were removed, the anon key returns zero rows from scrape_runs and
 * scrape_events. The guard exists so a logged-out visitor gets the login page
 * instead of an empty report.
 *
 * Nothing sensitive renders while the session is still resolving, so there is
 * no flash of report content on a hard refresh.
 */
export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isAdmin, loading, configError } = useAuth();

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-lg bg-slate-900 border border-red-800/70 rounded-2xl p-6 space-y-2">
          <h1 className="font-mono font-bold text-sm uppercase tracking-wide text-red-400">
            Configuration required
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">{configError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="font-mono text-xs uppercase tracking-widest">Checking access</span>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
