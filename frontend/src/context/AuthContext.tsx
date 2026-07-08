import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, User, getToken } from "@/src/lib/api";

type AuthState = {
  user: User | null;
  loading: boolean;
  signInWithOtp: (identifier: string, otp: string) => Promise<void>;
  signInWithGoogleSession: (sessionId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const t = await getToken();
      if (!t) { setUser(null); return; }
      const { user } = await api.me();
      setUser(user);
    } catch {
      await setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signInWithOtp = useCallback(async (identifier: string, otp: string) => {
    const res = await api.verifyOtp(identifier, otp);
    await setToken(res.token);
    setUser(res.user);
  }, []);

  const signInWithGoogleSession = useCallback(async (sessionId: string) => {
    const res = await api.googleSession(sessionId);
    await setToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch {}
    await setToken(null);
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, signInWithOtp, signInWithGoogleSession, signOut, refresh, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
