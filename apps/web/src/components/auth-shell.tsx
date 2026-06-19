"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { AppSidebar } from "@/components/app-sidebar";
import { Scale, Clock, CheckCircle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkBetaStatus, submitBetaRequest } from "@/lib/api";

const PUBLIC_PATHS = ["/login", "/create", "/blog", "/public-doc-chat"];
const PUBLIC_EXACT = ["/"];
const ADMIN_EMAILS = ["vikas@navyaai.com", "anand@navyaai.com", "marketing@navyaai.com"];
const BETA_STATUS_KEY = "lexhelm_beta_status";
const DEV_EMAILS = ["dev@lexhelm.local"];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || PUBLIC_EXACT.includes(pathname);
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;
  const isDev = user?.email ? DEV_EMAILS.includes(user.email.toLowerCase()) : false;
  const isAdminRoute = pathname.startsWith("/admin");

  const [betaStatus, setBetaStatus] = useState<string | null>(null);
  const [betaChecking, setBetaChecking] = useState(false);

  // Check beta status when user authenticates
  useEffect(() => {
    if (!isAuthenticated || !user?.email || isAdmin || isDev) {
      startTransition(() => {
        setBetaStatus(isAdmin || isDev ? "approved" : null);
      });
      return;
    }

    // Only use cache if status is "approved" (permanent), always recheck "pending"
    const cached = localStorage.getItem(BETA_STATUS_KEY);
    if (cached) {
      try {
        const { email, status } = JSON.parse(cached);
        if (email === user.email && status === "approved") {
          startTransition(() => {
            setBetaStatus("approved");
          });
          return;
        }
      } catch { /* ignore */ }
    }

    startTransition(() => {
      setBetaChecking(true);
    });
    checkBetaStatus(user.email)
      .then(async (res) => {
        if (res.status === "approved") {
          setBetaStatus("approved");
          localStorage.setItem(BETA_STATUS_KEY, JSON.stringify({
            email: user.email, status: "approved", ts: Date.now(),
          }));
        } else if (res.status === "not_found") {
          // Auto-submit beta request on first Google sign-in
          try {
            await submitBetaRequest({
              email: user.email,
              name: user.name || undefined,
            });
          } catch { /* already requested — ignore */ }
          setBetaStatus("pending");
          localStorage.setItem(BETA_STATUS_KEY, JSON.stringify({
            email: user.email, status: "pending", ts: Date.now(),
          }));
        } else {
          setBetaStatus("pending");
          localStorage.setItem(BETA_STATUS_KEY, JSON.stringify({
            email: user.email, status: "pending", ts: Date.now(),
          }));
        }
      })
      .catch(() => {
        // If check fails, allow access (fail open for dev)
        setBetaStatus("approved");
      })
      .finally(() => setBetaChecking(false));
  }, [isAuthenticated, user?.email, user?.name, isAdmin, isDev]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, isPublic, router]);

  // Block non-admin from admin routes
  useEffect(() => {
    if (!isLoading && isAuthenticated && isAdminRoute && !isAdmin) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, isAdminRoute, isAdmin, router]);

  if (isLoading || betaChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#415CA4] shadow-lg">
            <Scale className="h-8 w-8 text-white" />
          </div>
            <motion.div
              className="absolute -inset-2 rounded-2xl border-2 border-primary/20"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground font-medium">Loading LexHelm...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isPublic) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Beta gate — show pending screen if not approved
  if (betaStatus !== "approved" && !isAdmin && !isDev) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto text-center px-6"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">You&apos;re on the Waitlist</h1>
          <p className="text-muted-foreground mb-6">
            Thanks for signing up, <span className="font-medium text-foreground">{user?.name || user?.email}</span>!
            LexHelm is currently in private beta. We&apos;ll notify you at{" "}
            <span className="font-medium text-foreground">{user?.email}</span> once your access is approved.
          </p>
          <div className="rounded-xl border border-border bg-card p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Account Created</p>
                <p className="text-xs text-muted-foreground">Your spot is reserved. We review requests daily.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                localStorage.removeItem(BETA_STATUS_KEY);
                setBetaStatus(null);
                setBetaChecking(true);
                checkBetaStatus(user!.email)
                  .then((res) => {
                    if (res.status === "approved") {
                      setBetaStatus("approved");
                      localStorage.setItem(BETA_STATUS_KEY, JSON.stringify({
                        email: user!.email, status: "approved", ts: Date.now(),
                      }));
                    } else {
                      setBetaStatus("pending");
                    }
                  })
                  .catch(() => setBetaStatus("approved"))
                  .finally(() => setBetaChecking(false));
              }}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Check Status
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/search": "Legal Search Chat",
  "/doc-chat": "Review Document",
  "/documents": "Create Documents",
  "/admin": "Admin Panel",
  "/consultation": "Consultation",
};

function getPageName(pathname: string): string {
  // Exact match first
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  // Prefix match
  for (const [key, label] of Object.entries(PAGE_NAMES)) {
    if (pathname.startsWith(key + "/")) return label;
  }
  return "";
}

  return (
    <SidebarProvider>
      <SidebarRouteSync pathname={pathname} />
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Page Name Header */}
          {getPageName(pathname) && (
            <div className="shrink-0 border-b border-border/60 bg-card/70 backdrop-blur-sm px-6 py-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">LexHelm</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-sm font-semibold text-primary">{getPageName(pathname)}</span>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </SidebarProvider>
  );
}

/** Auto-collapse sidebar on doc-chat detail pages, auto-expand when leaving */
const COLLAPSE_ROUTES = [/^\/doc-chat\/.+/];

function SidebarRouteSync({ pathname }: { pathname: string }) {
  const { autoCollapse, autoExpand } = useSidebar();
  const wasCollapsed = useRef(false);

  useEffect(() => {
    const shouldCollapse = COLLAPSE_ROUTES.some((r) => r.test(pathname));
    if (shouldCollapse && !wasCollapsed.current) {
      autoCollapse();
      wasCollapsed.current = true;
    } else if (!shouldCollapse && wasCollapsed.current) {
      autoExpand();
      wasCollapsed.current = false;
    }
  }, [pathname, autoCollapse, autoExpand]);

  return null;
}
