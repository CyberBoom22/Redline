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
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="plate max-w-lg space-y-2 border border-accent p-6">
          <h1 className="h-section etch text-accent-deep">
            Configuration required
          </h1>
          <p className="text-[16px] text-text-2">{configError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-text-2">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="label-ui">Checking access</span>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
