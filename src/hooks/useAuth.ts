import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For local testing, we bypass Supabase session check and just finish loading
    setLoading(false);
  }, []);

  const signInWithGoogle = async () => {
    // Bypass Supabase OAuth to avoid unauthorized-domain errors during testing
    setUser({ id: 'local-tester', email: 'founder@pitchtank.local' } as User);
  };

  const signOut = async () => {
    setUser(null);
  };

  return { user, loading, signInWithGoogle, signOut };
}
