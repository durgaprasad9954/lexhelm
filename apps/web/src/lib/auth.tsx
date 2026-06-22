"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
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

function isLikelyJwt(token: string | null | undefined) {
  if (!token) return false;
  return token.split(".").length === 3;
}

function readStoredAuth(): { user: AuthUser | null; org: AuthOrg | null; token: string | null } {
  if (typeof window === "undefined") {
    return { user: null, org: null, token: null };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { user: null, org: null, token: null };
    }
    const { user, org, token } = JSON.parse(stored) as StoredAuth;
    if (!isLikelyJwt(token)) {
      localStorage.removeItem(STORAGE_KEY);
      return { user: null, org: null, token: null };
    }
    return { user, org, token };
  } catch {
    return { user: null, org: null, token: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [storedAuth] = useState(readStoredAuth);
  const [user, setUser] = useState<AuthUser | null>(storedAuth.user);
  const [org, setOrg] = useState<AuthOrg | null>(storedAuth.org);
  const [token, setToken] = useState<string | null>(storedAuth.token);
  const [isLoading] = useState(false);

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
    setUser(googleUser);
    setOrg(googleOrg);
    setToken(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: googleUser, org: googleOrg, token: t }));
  }, []);

  const login = useCallback(async (u: AuthUser, o: AuthOrg, t?: string) => {
    if (!t) throw new Error("Token required — use loginWithGoogle instead");
    setAuthToken(t);
    setUser(u);
    setOrg(o);
    setToken(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, org: o, token: t }));
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
    setUser(devUser);
    setOrg(devOrg);
    setToken(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: devUser, org: devOrg, token: t }));
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null); // sync immediately before state update
    setUser(null);
    setOrg(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const switchOrg = useCallback(async (o: AuthOrg) => {
    if (!user || !token) return;
    // For now, just update the org in state — the existing token stays valid
    // A proper implementation would call the backend to re-sign with new org_id
    setOrg(o);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, org: o, token }));
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
