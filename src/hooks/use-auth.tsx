import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/query-client";

export type AppRole = "admin" | "financeiro" | "secretaria";
export type ProfileStatus = "pending" | "active" | "blocked";

export interface AppProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AppProfile | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const APP_STORAGE_PREFIX = "imperio:";
const SUPABASE_AUTH_STORAGE_KEY = (() => {
  try {
    const host = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;
    const projectRef = host.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
})();

function isAppStorageKey(key: string) {
  return (
    key.startsWith(APP_STORAGE_PREFIX) ||
    (SUPABASE_AUTH_STORAGE_KEY !== null && key.startsWith(SUPABASE_AUTH_STORAGE_KEY))
  );
}

function clearAppStorage(storage: Storage | undefined) {
  if (!storage) return;
  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i);
    if (key && isAppStorageKey(key)) storage.removeItem(key);
  }
}

async function clearAppIndexedDB() {
  if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function") return;
  const databases = await indexedDB.databases();
  await Promise.all(
    databases
      .map((db) => db.name)
      .filter((name): name is string => Boolean(name && name.startsWith(APP_STORAGE_PREFIX)))
      .map(
        (name) =>
          new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
  );
}

async function clearAuthenticatedAppState() {
  supabase.getChannels().forEach((channel) => {
    void supabase.removeChannel(channel);
  });
  await queryClient.cancelQueries();
  queryClient.clear();
  if (typeof window !== "undefined") {
    clearAppStorage(window.localStorage);
    clearAppStorage(window.sessionStorage);
    await clearAppIndexedDB();
  }
}

async function loadProfile(userId: string): Promise<{ profile: AppProfile | null; roles: AppRole[] }> {
  const [{ data: profile }, { data: rolesData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, avatar_url, status").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  return {
    profile: (profile as AppProfile | null) ?? null,
    roles: ((rolesData ?? []) as { role: AppRole }[]).map((r) => r.role),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const authVersionRef = useRef(0);

  const hydrate = async (s: Session | null) => {
    const authVersion = (authVersionRef.current += 1);
    setSession(s);
    if (!s?.user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    try {
      const { profile: p, roles: r } = await loadProfile(s.user.id);
      if (authVersionRef.current !== authVersion) return;
      setProfile(p);
      setRoles(r);
    } finally {
      if (authVersionRef.current === authVersion) setLoading(false);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const authVersion = (authVersionRef.current += 1);
      // defer profile fetch to avoid deadlocks inside callback
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          loadProfile(s.user.id).then(({ profile, roles }) => {
            if (authVersionRef.current !== authVersion) return;
            setProfile(profile);
            setRoles(roles);
            setLoading(false);
          });
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      loading,
      hasRole: (r) => roles.includes(r),
      signOut: async () => {
        authVersionRef.current += 1;
        setLoading(true);
        setSession(null);
        setProfile(null);
        setRoles([]);
        let signOutError: unknown = null;
        try {
          const { error } = await supabase.auth.signOut();
          signOutError = error;
        } catch (error) {
          signOutError = error;
        } finally {
          await clearAuthenticatedAppState();
          setLoading(false);
        }
        if (signOutError)
          throw new Error(
            signOutError instanceof Error
              ? `Falha ao encerrar a sessão: ${signOutError.message}`
              : "Falha ao encerrar a sessão com segurança.",
          );
      },
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        await hydrate(data.session);
      },
    }),
    [session, profile, roles, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
