"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { AppSidebar } from "@/components/app-sidebar";
import { Scale } from "lucide-react";

const PUBLIC_PATHS = ["/login", "/create", "/blog", "/public-doc-chat"];
const PUBLIC_EXACT = ["/"];
const ADMIN_EMAILS = ["vikas@navyaai.com", "anand@navyaai.com", "marketing@navyaai.com"];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || PUBLIC_EXACT.includes(pathname);
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;
  const isAdminRoute = pathname.startsWith("/admin");

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

  if (isLoading) {
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
