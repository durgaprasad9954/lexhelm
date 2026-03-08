"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  /** Auto-collapse for a route — remembers pre-collapse state and restores on leave */
  autoCollapse: () => void;
  autoExpand: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
  autoCollapse: () => {},
  autoExpand: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((v) => !v), []);
  const prevState = useRef<boolean | null>(null);

  const autoCollapse = useCallback(() => {
    setCollapsed((current) => {
      if (!current) prevState.current = current;
      return true;
    });
  }, []);

  const autoExpand = useCallback(() => {
    if (prevState.current !== null) {
      setCollapsed(prevState.current);
      prevState.current = null;
    } else {
      setCollapsed(false);
    }
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle, autoCollapse, autoExpand }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
