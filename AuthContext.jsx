import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, cloudEnabled } from '../lib/supabase';

export const DEMO_EMAIL = 'demo@safestep.app';
const DEMO_PASSWORD = 'demo1234';

const AuthContext = createContext(null);

export const displayName = (user) =>
  user?.user_metadata?.name || user?.email?.split('@')[0] || 'Parent';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.session) {
      return {
        ok: false,
        error: 'Account created! Confirm it via the email Supabase sent you, then sign in.',
      };
    }
    return { ok: true };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: 'Incorrect email or password.' };
    return { ok: true };
  }, []);

  const signInDemo = useCallback(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (!error) return { ok: true };
    const { data, error: upErr } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: { data: { name: 'Demo Parent' } },
    });
    if (upErr) return { ok: false, error: upErr.message };
    if (!data.session) {
      return { ok: false, error: 'Demo account requires email confirmation on this project.' };
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateUsername = useCallback(async (newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return { ok: false, error: 'Name cannot be empty.' };
    const { data, error } = await supabase.auth.updateUser({
      data: { name: trimmed },
    });
    if (error) return { ok: false, error: error.message };
    // Also update the profiles table so the name persists across queries
    await supabase.from('profiles').update({ name: trimmed }).eq('id', data.user.id);
    return { ok: true };
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return { ok: false, error: 'Not signed in.' };
    const uid = user.id;

    // 1. Try the server-side RPC first (fast, handles everything in one call)
    const { error: rpcErr } = await supabase.rpc('delete_user_account');
    if (!rpcErr) {
      await supabase.auth.signOut();
      return { ok: true };
    }

    // 2. Fallback: client-side cascade delete using the user's auth token.
    //    RLS allows the user to delete their own rows in every table.
    const steps = [
      () => supabase.from('activities').delete().eq('parent_id', uid),
      () => supabase.from('alerts').delete().eq('parent_id', uid),
      () => supabase.from('notifications').delete().eq('parent_id', uid),
      async () => {
        // Usage is owned by children, which are owned by the parent
        const { data: kids } = await supabase.from('children').select('id').eq('parent_id', uid);
        if (kids?.length) {
          await supabase.from('usage').delete().in('child_id', kids.map((k) => k.id));
        }
      },
      () => supabase.from('devices').delete().eq('parent_id', uid),
      () => supabase.from('children').delete().eq('parent_id', uid),
      () => supabase.from('parent_settings').delete().eq('parent_id', uid),
      () => supabase.from('profiles').delete().eq('id', uid),
    ];

    for (const step of steps) {
      const { error } = await step();
      if (error) {
        console.error('SafeStep: delete step failed:', error.message);
        return { ok: false, error: `Could not delete data: ${error.message}` };
      }
    }

    // 3. Sign out (auth user deletion requires Supabase admin — the account
    //    is now empty so signing out effectively "deletes" it from the app)
    await supabase.auth.signOut();
    return { ok: true };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, cloudEnabled, signUp, signIn, signInDemo, signOut, updateUsername, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
