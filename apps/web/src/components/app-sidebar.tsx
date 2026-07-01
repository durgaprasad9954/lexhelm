"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Building2,
  Scale,
  Search,
  ChevronUp,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useSidebar } from "@/lib/sidebar-context";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-foreground/70" },
  { href: "/search", label: "Legal Search", icon: Search, color: "text-foreground/70" },
  { href: "/documents", label: "Create Documents", icon: FileText, color: "text-foreground/70" },
  { href: "/doc-chat", label: "Review Document", icon: MessageSquare, color: "text-foreground/70" },
  { href: "/documents?tab=saved", label: "Your Documents", icon: FileText, color: "text-foreground/70" },
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
  const { user, org, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { collapsed, toggle } = useSidebar();
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
    <aside className={cn(
      "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
      collapsed ? "w-16" : "w-64",
    )}>
      {/* Brand */}
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-3 py-5 transition-opacity hover:opacity-90",
          collapsed ? "justify-center px-2" : "px-5",
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#415CA4] shadow-sm shrink-0">
          <Scale className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight">LexHelm</span>
            <span className="text-[11px] font-medium text-muted-foreground">Legal Workspace</span>
          </div>
        )}
      </Link>

      {/* Org */}
      {org && !collapsed && (
        <div className="mx-3 mb-2 rounded-lg bg-accent/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-primary/60" />
            <span className="text-xs font-medium truncate">{org.name}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 py-2", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Navigation
          </p>
        )}
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const [pathOnly, queryString] = href.split("?");
          const tab = queryString ? new URLSearchParams(queryString).get("tab") : null;
          const active = tab
            ? pathname === pathOnly && searchParams.get("tab") === tab
            : pathname === pathOnly || (pathOnly !== "/dashboard" && pathname.startsWith(pathOnly));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
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
              <Icon className={cn("relative h-4 w-4 transition-colors shrink-0", active ? "text-primary" : color + " group-hover:text-foreground")} />
              {!collapsed && <span className="relative">{label}</span>}
              {active && !collapsed && (
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
            {!collapsed && (
              <p className="mt-4 mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Admin
              </p>
            )}
            <Link
              href="/admin"
              title={collapsed ? "Admin" : undefined}
              className={cn(
                "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-2 py-2.5 mt-4" : "gap-3 px-3 py-2.5",
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
              <ShieldCheck className={cn("relative h-4 w-4 transition-colors shrink-0", pathname.startsWith("/admin") ? "text-primary" : "text-primary group-hover:text-foreground")} />
              {!collapsed && <span className="relative">Admin</span>}
              {pathname.startsWith("/admin") && !collapsed && (
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

      {/* Collapse toggle */}
      <div className={cn("flex mb-1", collapsed ? "justify-center px-2" : "px-3")}>
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
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
                  <p className="mt-1 text-[11px] text-muted-foreground/60 truncate">
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
          className={cn(
            "flex w-full items-center hover:bg-sidebar-accent/50 transition-colors",
            collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3.5",
          )}
        >
          {user ? (
            <>
              <UserAvatar user={user} />
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-semibold truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: menuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  </motion.div>
                </>
              )}
            </>
          ) : (
            !collapsed && <p className="text-xs text-muted-foreground">LexHelm V2</p>
          )}
        </button>
      </div>
    </aside>
  );
}
