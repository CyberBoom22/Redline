import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Member accounts for the public app.
 *
 * Accounts are optional. Everything works signed out, and a deployment without
 * Supabase configured simply reports `available: false` so account UI hides.
 * Reading the stored session is local; the network is touched only when
 * Supabase refreshes an expired token or someone signs in or out.
 *
 * Unlike the admin AuthProvider this makes no admin check: being signed in here
 * grants nothing beyond what RLS allows the account itself.
 */
interface MemberState {
  /** False when Supabase is not configured for this deployment. */
  available: boolean;
  session: Session | null;
  /** True until the stored session has been read. */
  loading: boolean;
  signOut: () => Promise<void>;
}

const MemberContext = createContext<MemberState | undefined>(undefined);

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(supabase !== null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: MemberState = {
    available: supabase !== null,
    session,
    loading,
    signOut: async () => {
      await supabase?.auth.signOut();
    },
  };

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
};

export function useMember(): MemberState {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error('useMember must be used inside MemberProvider');
  return ctx;
}
