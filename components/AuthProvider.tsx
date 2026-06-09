"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type Member } from "@/lib/supabaseClient";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  member: Member | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  member: null,
  isAdmin: false,
  signOut: async () => {},
  refreshMember: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);

  const loadMember = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setMember(null);
      return;
    }
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    setMember((data as Member) ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadMember(data.session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadMember(s?.user?.id);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadMember]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setMember(null);
  };

  const refreshMember = async () => {
    await loadMember(session?.user?.id);
  };

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        member,
        isAdmin: !!member?.is_admin,
        signOut,
        refreshMember,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
