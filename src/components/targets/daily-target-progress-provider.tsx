"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type DailyTargetProgress, getDailyTargetProgress } from "@/lib/actions/daily-targets";

type DailyTargetProgressContextValue = {
  progress: DailyTargetProgress | null;
  refreshProgress: () => Promise<void>;
};

const DailyTargetProgressContext = createContext<DailyTargetProgressContextValue | null>(null);

export function useDailyTargetProgress(): DailyTargetProgressContextValue {
  const context = useContext(DailyTargetProgressContext);

  if (!context) {
    throw new Error("useDailyTargetProgress must be used within DailyTargetProgressProvider");
  }

  return context;
}

export function useDailyTargetProgressOptional(): DailyTargetProgressContextValue | null {
  return useContext(DailyTargetProgressContext);
}

export function DailyTargetProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<DailyTargetProgress | null>(null);

  const refreshProgress = useCallback(async () => {
    const result = await getDailyTargetProgress();

    if (result.success) {
      setProgress(result.data);
    }
  }, []);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  const value = useMemo(() => ({ progress, refreshProgress }), [progress, refreshProgress]);

  return (
    <DailyTargetProgressContext.Provider value={value}>
      {children}
    </DailyTargetProgressContext.Provider>
  );
}
