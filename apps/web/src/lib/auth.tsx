"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setAuthToken, loginWithGoogleBackend } from "@/lib/api";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [org, setOrg] = useState<AuthOrg | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync token to API module
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { user: u, org: o, token: t } = JSON.parse(stored) as StoredAuth;
        if (t) {
          setAuthToken(t);
          setUser(u);
          setOrg(o);
          setToken(t);
        }
      }
      // If no stored session → stay unauthenticated (show login)
    } catch {
      // corrupt storage — ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      logout,
      switchOrg,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
