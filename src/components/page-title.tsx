"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getDefaultPageTitle } from "@/lib/page-titles";

type PageTitleState = {
  title: string;
  leadCount?: number;
};

type PageTitleContextValue = {
  state: PageTitleState | null;
  setState: (state: PageTitleState | null) => void;
  setLeadCount: (leadCount: number) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PageTitleState | null>(null);

  const setLeadCount = useMemo(
    () => (leadCount: number) => {
      setState((current) => (current ? { ...current, leadCount } : null));
    },
    [],
  );

  const value = useMemo(() => ({ state, setState, setLeadCount }), [state, setLeadCount]);

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function SetPageTitle({ title, leadCount }: { title: string; leadCount?: number }) {
  const setPageTitle = useContext(PageTitleContext)?.setState;

  useEffect(() => {
    if (!setPageTitle) return;
    setPageTitle({ title, leadCount });
    return () => setPageTitle(null);
  }, [title, leadCount, setPageTitle]);

  return null;
}

export function useSetLeadCount() {
  return useContext(PageTitleContext)?.setLeadCount;
}

export function usePageTitle(): PageTitleState {
  const pathname = usePathname();
  const context = useContext(PageTitleContext);

  return context?.state ?? getDefaultPageTitle(pathname);
}
