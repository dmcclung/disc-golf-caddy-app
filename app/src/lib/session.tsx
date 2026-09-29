import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { fetchThrows } from './api';
import { configurePurchases, hasPro, purchasesEnabled } from './purchases';
import { FREE_ANALYSES, supabase } from './supabase';
import type { Profile, ThrowRow } from './types';

type SessionState = {
  ready: boolean;
  error: string | null;
  user: User | null;
  profile: Profile | null;
  isPro: boolean;
  throws: ThrowRow[];
  freeRemaining: number;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  refreshThrows: () => Promise<void>;
  refreshPro: () => Promise<void>;
  setCustomerInfo: (info: CustomerInfo) => void;
  retry: () => void;
};

const SessionContext = createContext<SessionState | null>(null);

/** Anonymous Supabase auth + profile + Pro status + throw history, loaded once at launch. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rcPro, setRcPro] = useState(false);
  const [dbPro, setDbPro] = useState(false);
  const [analysesUsed, setAnalysesUsed] = useState(0);
  const [throws, setThrows] = useState<ThrowRow[]>([]);

  const loadEntitlements = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('entitlements')
      .select('is_pro, expires_at, analyses_used')
      .eq('user_id', userId)
      .maybeSingle();
    setDbPro(!!data?.is_pro && (!data.expires_at || new Date(data.expires_at) > new Date()));
    setAnalysesUsed(data?.analyses_used ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        let { data } = await supabase.auth.getSession();
        let current = data.session?.user ?? null;
        if (!current) {
          const res = await supabase.auth.signInAnonymously();
          if (res.error) throw res.error;
          current = res.data.user;
        }
        if (!current) throw new Error('No user');

        configurePurchases(current.id);
        const [{ data: p, error: pErr }, list] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', current.id).single(),
          fetchThrows(),
          loadEntitlements(current.id),
        ]);
        if (pErr) throw pErr;
        if (purchasesEnabled) {
          Purchases.getCustomerInfo().then((info) => !cancelled && setRcPro(hasPro(info))).catch(() => {});
        }
        if (cancelled) return;
        setUser(current);
        setProfile(p as Profile);
        setThrows(list);
        setReady(true);
      } catch (e) {
        console.warn('session bootstrap failed', e);
        if (!cancelled) {
          setError("Couldn't connect. Check your connection and try again.");
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, loadEntitlements]);

  useEffect(() => {
    if (!purchasesEnabled || !user) return;
    const listener = (info: CustomerInfo) => setRcPro(hasPro(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [user]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return;
      setProfile((p) => (p ? { ...p, ...patch } : p));
      const { error: err } = await supabase
        .from('profiles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (err) throw err;
    },
    [user],
  );

  const refreshThrows = useCallback(async () => {
    const [list] = await Promise.all([fetchThrows(), user ? loadEntitlements(user.id) : null]);
    setThrows(list);
  }, [user, loadEntitlements]);

  const refreshPro = useCallback(async () => {
    if (!user) return;
    await loadEntitlements(user.id);
    if (purchasesEnabled) setRcPro(hasPro(await Purchases.getCustomerInfo()));
  }, [user, loadEntitlements]);

  const value = useMemo<SessionState>(
    () => ({
      ready,
      error,
      user,
      profile,
      isPro: rcPro || dbPro,
      throws,
      freeRemaining: Math.max(0, FREE_ANALYSES - analysesUsed),
      updateProfile,
      refreshThrows,
      refreshPro,
      setCustomerInfo: (info) => setRcPro(hasPro(info)),
      retry: () => {
        setReady(false);
        setAttempt((n) => n + 1);
      },
    }),
    [ready, error, user, profile, rcPro, dbPro, throws, analysesUsed, updateProfile, refreshThrows, refreshPro],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
