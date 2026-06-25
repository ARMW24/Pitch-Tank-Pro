import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCheck = async (session: any) => {
      const email = session?.user?.email;
      if (email) {
        const allowedStr = import.meta.env.VITE_ALLOWED_EMAILS || '';
        const allowedList = allowedStr.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
        if (allowedList.length > 0 && !allowedList.includes(email.toLowerCase())) {
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          window.dispatchEvent(new CustomEvent('auth-unauthorized', { detail: email }));
          return;
        }
      }
      setUser(session?.user ?? null);
      setLoading(false);
    };

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthCheck(session);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthCheck(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { user, loading, signInWithGoogle, signOut };
}
