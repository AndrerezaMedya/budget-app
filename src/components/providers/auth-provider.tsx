"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import * as React from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthProviderProps = {
  children: React.ReactNode;
  initialSession?: Session | null;
  initialUser?: User | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  signInWithGoogle: (redirectTo: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string, redirectTo: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialSession = null,
  initialUser = null,
}: AuthProviderProps) {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = React.useState<Session | null>(initialSession);
  const [user, setUser] = React.useState<User | null>(initialUser);
  const [loading, setLoading] = React.useState(!initialSession);

  React.useEffect(() => {
    let isMounted = true;

    const resolveSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error || !isMounted) {
        console.error("Failed to load session", error);
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    };

    void resolveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        if (!isMounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshSession = React.useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setUser(data.session?.user ?? null);
    setLoading(false);
  }, [supabase]);

  const signInWithGoogle = React.useCallback(
    async (redirectTo: string) => {
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("redirectTo", redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    },
    [supabase],
  );

  const signInWithEmail = React.useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      await refreshSession();
    },
    [refreshSession, supabase],
  );

  const signUpWithEmail = React.useCallback(
    async (email: string, password: string) => {
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("redirectTo", "/app/overview");

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl.toString(),
        },
      });

      if (error) {
        throw error;
      }
      await refreshSession();
    },
    [refreshSession, supabase],
  );

  const resetPassword = React.useCallback(
    async (email: string, redirectTo: string) => {
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("redirectTo", redirectTo);
      redirectUrl.searchParams.set("type", "recovery");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl.toString(),
      });
      if (error) {
        throw error;
      }
    },
    [supabase],
  );

  const signOutUser = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    await refreshSession();
  }, [refreshSession, supabase]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      refreshSession,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOutUser,
    }),
    [
      loading,
      resetPassword,
      refreshSession,
      session,
      signInWithEmail,
      signInWithGoogle,
      signOutUser,
      signUpWithEmail,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
