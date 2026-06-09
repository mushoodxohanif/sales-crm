"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getDefaultPageTitle } from "@/lib/page-titles";

type PageTitleState = {
  title: string;
};

type PageTitleContextValue = {
  state: PageTitleState | null;
  setState: (state: PageTitleState | null) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PageTitleState | null>(null);
  const value = useMemo(() => ({ state, setState }), [state]);

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function SetPageTitle({ title }: { title: string }) {
  const setPageTitle = useContext(PageTitleContext)?.setState;

  useEffect(() => {
    if (!setPageTitle) return;
    setPageTitle({ title });
    return () => setPageTitle(null);
  }, [title, setPageTitle]);

  return null;
}

export function usePageTitle(): PageTitleState {
  const pathname = usePathname();
  const context = useContext(PageTitleContext);

  return context?.state ?? getDefaultPageTitle(pathname);
}
