import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  isAdmin: boolean;
  /** True until BOTH the session and the admin check have resolved. */
  loading: boolean;
  configError: string | null;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Admin status comes from the database, not from anything the client holds.
  // A JWT proves who you are; only is_admin() says whether you are the admin.
  const checkAdmin = useCallback(async (active: Session | null): Promise<boolean> => {
    if (!supabase || !active) return false;
    const { data, error } = await supabase.rpc('is_admin');
    if (error) return false;
    return data === true;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    // Resolve the stored session first, so a hard refresh does not render as
    // logged out and then flip.
    supabase.auth.getSession().then(async ({ data }) => {
      const active = data.session ?? null;
      const admin = await checkAdmin(active);
      if (cancelled) return;
      setSession(active);
      setIsAdmin(admin);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      // Re-check on every transition: signing in, out, or a token refresh can
      // all change what this client is allowed to see.
      setLoading(true);
      const admin = await checkAdmin(next);
      if (cancelled) return;
      setSession(next);
      setIsAdmin(admin);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [checkAdmin]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  }, []);

  const refreshAdmin = useCallback(async () => {
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const active = data.session ?? null;
    setSession(active);
    setIsAdmin(await checkAdmin(active));
  }, [checkAdmin]);

  return (
    <AuthContext.Provider
      value={{ session, isAdmin, loading, configError: supabaseConfigError, signOut, refreshAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
