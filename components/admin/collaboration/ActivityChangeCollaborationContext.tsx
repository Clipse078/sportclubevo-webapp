"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";

type ActivityChangeCollaborationContextValue = {
  impact: ActivityChangeImpact | null;
  setImpact: (impact: ActivityChangeImpact | null) => void;
  dismissImpact: () => void;
};

const ActivityChangeCollaborationContext =
  createContext<ActivityChangeCollaborationContextValue | null>(null);

export function ActivityChangeCollaborationProvider({ children }: { children: ReactNode }) {
  const [impact, setImpactState] = useState<ActivityChangeImpact | null>(null);

  const setImpact = useCallback((next: ActivityChangeImpact | null) => {
    setImpactState(next?.worthy ? next : null);
  }, []);

  const dismissImpact = useCallback(() => setImpactState(null), []);

  const value = useMemo(
    () => ({ impact, setImpact, dismissImpact }),
    [impact, setImpact, dismissImpact],
  );

  return (
    <ActivityChangeCollaborationContext.Provider value={value}>
      {children}
    </ActivityChangeCollaborationContext.Provider>
  );
}

export function useActivityChangeCollaboration(): ActivityChangeCollaborationContextValue {
  const ctx = useContext(ActivityChangeCollaborationContext);
  if (!ctx) {
    throw new Error(
      "useActivityChangeCollaboration must be used within ActivityChangeCollaborationProvider",
    );
  }
  return ctx;
}
