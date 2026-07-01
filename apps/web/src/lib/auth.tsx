"use client";
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { setAuthToken, loginWithGoogleBackend, loginWithDevBackend } from "@/lib/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const STORAGE_KEY = "lexhelm_auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthOrg {
  id: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  org: AuthOrg | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  googleClientId: string;
  loginWithGoogle: (credentialResponse: { credential?: string }) => Promise<void>;
  login: (user: AuthUser, org: AuthOrg, token?: string) => Promise<void>;
  loginAsDeveloper: () => Promise<void>;
  logout: () => void;
  switchOrg: (org: AuthOrg) => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  org: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  googleClientId: "",
  loginWithGoogle: async () => {},
  login: async () => {},
  loginAsDeveloper: async () => {},
  logout: () => {},
  switchOrg: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface StoredAuth {
  user: AuthUser;
  org: AuthOrg;
  token: string;
}

interface AuthSnapshot {
  user: AuthUser | null;
  org: AuthOrg | null;
  token: string | null;
}

const EMPTY_AUTH_SNAPSHOT: AuthSnapshot = {
  user: null,
  org: null,
  token: null,
};
const authListeners = new Set<() => void>();
let cachedStoredAuthRaw: string | null = null;
let cachedStoredAuthSnapshot: AuthSnapshot = EMPTY_AUTH_SNAPSHOT;

function isLikelyJwt(token: string | null | undefined) {
  if (!token) return false;
  return token.split(".").length === 3;
}

function emitAuthChange() {
  for (const listener of authListeners) {
    listener();
  }
}

function subscribeAuth(listener: () => void) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function readStoredAuth(): AuthSnapshot {
  if (typeof window === "undefined") {
    return EMPTY_AUTH_SNAPSHOT;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      cachedStoredAuthRaw = null;
      cachedStoredAuthSnapshot = EMPTY_AUTH_SNAPSHOT;
      return EMPTY_AUTH_SNAPSHOT;
    }
    if (stored === cachedStoredAuthRaw) {
      return cachedStoredAuthSnapshot;
    }
    const { user, org, token } = JSON.parse(stored) as StoredAuth;
    if (!isLikelyJwt(token)) {
      localStorage.removeItem(STORAGE_KEY);
      cachedStoredAuthRaw = null;
      cachedStoredAuthSnapshot = EMPTY_AUTH_SNAPSHOT;
      return EMPTY_AUTH_SNAPSHOT;
    }
    cachedStoredAuthRaw = stored;
    cachedStoredAuthSnapshot = { user, org, token };
    return cachedStoredAuthSnapshot;
  } catch {
    cachedStoredAuthRaw = null;
    cachedStoredAuthSnapshot = EMPTY_AUTH_SNAPSHOT;
    return EMPTY_AUTH_SNAPSHOT;
  }
}

function readServerAuth(): AuthSnapshot {
  return EMPTY_AUTH_SNAPSHOT;
}

function readHydrationSnapshot() {
  return true;
}

function readServerHydrationSnapshot() {
  return false;
}

function persistAuth(snapshot: AuthSnapshot) {
  if (typeof window === "undefined") return;
  if (!snapshot.user || !snapshot.org || !snapshot.token) {
    localStorage.removeItem(STORAGE_KEY);
    cachedStoredAuthRaw = null;
    cachedStoredAuthSnapshot = EMPTY_AUTH_SNAPSHOT;
    emitAuthChange();
    return;
  }
  const serialized = JSON.stringify(snapshot);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedStoredAuthRaw = serialized;
  cachedStoredAuthSnapshot = snapshot;
  emitAuthChange();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, org, token } = useSyncExternalStore(subscribeAuth, readStoredAuth, readServerAuth);
  const hasHydrated = useSyncExternalStore(subscribeAuth, readHydrationSnapshot, readServerHydrationSnapshot);
  const isLoading = !hasHydrated;

  // Sync token to API module
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const loginWithGoogle = useCallback(async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) throw new Error("No credential received from Google");

    console.log("[Auth] Received Google credential, sending to backend...");
    
    // Send Google ID token to backend — it verifies and returns a signed JWT
    const result = await loginWithGoogleBackend(credentialResponse.credential);
    console.log("[Auth] Backend auth successful, user:", result.user.email);
    const googleUser: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      picture: result.user.picture,
    };
    const googleOrg: AuthOrg = {
      id: result.org.id,
      name: result.org.name,
    };
    const t = result.token;

    setAuthToken(t);
    persistAuth({ user: googleUser, org: googleOrg, token: t });
  }, []);

  const login = useCallback(async (u: AuthUser, o: AuthOrg, t?: string) => {
    if (!t) throw new Error("Token required — use loginWithGoogle instead");
    setAuthToken(t);
    persistAuth({ user: u, org: o, token: t });
  }, []);

  const loginAsDeveloper = useCallback(async () => {
    const result = await loginWithDevBackend();
    const devUser: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      picture: result.user.picture,
    };
    const devOrg: AuthOrg = {
      id: result.org.id,
      name: result.org.name,
    };
    const t = result.token;

    setAuthToken(t);
    persistAuth({ user: devUser, org: devOrg, token: t });
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null); // sync immediately before state update
    persistAuth(EMPTY_AUTH_SNAPSHOT);
  }, []);

  const switchOrg = useCallback(async (o: AuthOrg) => {
    if (!user || !token) return;
    // For now, just update the org in state — the existing token stays valid
    // A proper implementation would call the backend to re-sign with new org_id
    persistAuth({ user, org: o, token });
  }, [user, token]);

  return (
    <AuthContext.Provider value={{
      user,
      org,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      googleClientId: GOOGLE_CLIENT_ID,
      loginWithGoogle,
      login,
      loginAsDeveloper,
      logout,
      switchOrg,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
