import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface UseAnonymousAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  ensureAuthenticated: () => Promise<User | null>;
}

export function useAnonymousAuth(): UseAnonymousAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureAuthenticated = useCallback(async (): Promise<User | null> => {
    // Check if already authenticated
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (currentSession?.user) {
      return currentSession.user;
    }

    // Sign in anonymously
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('[Auth] Anonymous sign-in failed:', error);
        return null;
      }

      return data.user;
    } catch (err) {
      console.error('[Auth] Error during anonymous sign-in:', err);
      return null;
    }
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session?.user,
    ensureAuthenticated,
  };
}
