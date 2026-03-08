"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Home,
  MessageSquare,
  Search,
  Scale,
  Briefcase,
  Building2,
  LogOut,
  ChevronUp,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home, color: "text-blue-500" },
  { href: "/search", label: "Case Search", icon: Search, color: "text-violet-500" },
  { href: "/doc-chat", label: "Doc Chat", icon: MessageSquare, color: "text-emerald-500" },
  { href: "/documents", label: "Drafting", icon: FileText, color: "text-amber-500" },
  { href: "/jobs", label: "Jobs", icon: Briefcase, color: "text-rose-500" },
] as const;

const ADMIN_EMAILS = ["vikas@navyaai.com", "anand@navyaai.com", "marketing@navyaai.com"];

function UserAvatar({ user }: { user: { name: string; picture?: string } }) {
  if (user.picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.picture}
        alt={user.name}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
        referrerPolicy="no-referrer"
      />
    );
  }
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-2 ring-primary/20">
      {initials}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, org, logout } = useAuth();
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Scale className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight">LexHelm</span>
          <span className="text-[10px] font-medium text-muted-foreground">Legal Intelligence</span>
        </div>
      </div>

      {/* Org */}
      {org && (
        <div className="mx-3 mb-2 rounded-lg bg-accent/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-primary/60" />
            <span className="text-xs font-medium truncate">{org.name}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Navigation
        </p>
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className={cn("relative h-4 w-4 transition-colors", active ? "text-primary" : color + " group-hover:text-foreground")} />
              <span className="relative">{label}</span>
              {active && (
                <motion.div
                  layoutId="sidebar-dot"
                  className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="mt-4 mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Admin
            </p>
            <Link
              href="/admin"
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground",
              )}
            >
              {pathname.startsWith("/admin") && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <ShieldCheck className={cn("relative h-4 w-4 transition-colors", pathname.startsWith("/admin") ? "text-primary" : "text-cyan-500 group-hover:text-foreground")} />
              <span className="relative">Admin</span>
              {pathname.startsWith("/admin") && (
                <motion.div
                  layoutId="sidebar-dot"
                  className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </Link>
          </>
        )}
      </nav>

      {/* AI Badge */}
      <div className="mx-3 mb-3">
        <div className="rounded-lg bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">AI Powered</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Search cases, draft documents, and analyze contracts with AI.
          </p>
        </div>
      </div>

      {/* User Profile & Menu */}
      <div className="relative border-t border-sidebar-border" ref={menuRef}>
        <AnimatePresence>
          {menuOpen && user && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 right-0 mx-3 mb-2 rounded-xl border border-border bg-popover p-1.5 shadow-xl"
            >
              <div className="px-3 py-2.5 border-b border-border mb-1.5">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                {org && (
                  <p className="mt-1 text-[10px] text-muted-foreground/60 truncate">
                    {org.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-sidebar-accent/50 transition-colors"
        >
          {user ? (
            <>
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-semibold truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <motion.div
                animate={{ rotate: menuOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              </motion.div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">LexHelm V2</p>
          )}
        </button>
      </div>
    </aside>
  );
}
