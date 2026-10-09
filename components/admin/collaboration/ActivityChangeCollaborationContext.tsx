"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityChangeImpact,
  ActivityCollaborationDomain,
} from "@/lib/collaboration/activity-change/types";
import type { CollaborationCycleBaseline } from "@/lib/collaboration/activity-change/cycle-baseline";

type ActivityChangeCollaborationContextValue = {
  impact: ActivityChangeImpact | null;
  setImpact: (impact: ActivityChangeImpact | null) => void;
  dismissImpact: () => void;
  getCycleBaselineForRequest: (
    domain: ActivityCollaborationDomain,
    activityId: string,
  ) => CollaborationCycleBaseline["baseline"] | undefined;
  getExistingCycleBaseline: () => CollaborationCycleBaseline["baseline"] | undefined;
  setCycleBaseline: (
    domain: ActivityCollaborationDomain,
    activityId: string,
    baseline: CollaborationCycleBaseline["baseline"] | null,
  ) => void;
  acknowledgeCommunicationSent: () => void;
};

const ActivityChangeCollaborationContext =
  createContext<ActivityChangeCollaborationContextValue | null>(null);

type StoredCycle = {
  domain: ActivityCollaborationDomain;
  activityId: string;
  baseline: CollaborationCycleBaseline["baseline"];
};

export function ActivityChangeCollaborationProvider({ children }: { children: ReactNode }) {
  const [impact, setImpactState] = useState<ActivityChangeImpact | null>(null);
  const cycleRef = useRef<StoredCycle | null>(null);

  const setImpact = useCallback((next: ActivityChangeImpact | null) => {
    setImpactState(next?.worthy ? next : null);
  }, []);

  const clearCycle = useCallback(() => {
    cycleRef.current = null;
    setImpactState(null);
  }, []);

  const dismissImpact = useCallback(() => {
    clearCycle();
  }, [clearCycle]);

  const acknowledgeCommunicationSent = useCallback(() => {
    clearCycle();
  }, [clearCycle]);

  const setCycleBaseline = useCallback(
    (
      domain: ActivityCollaborationDomain,
      activityId: string,
      baseline: CollaborationCycleBaseline["baseline"] | null,
    ) => {
      if (!baseline) {
        cycleRef.current = null;
        return;
      }
      cycleRef.current = { domain, activityId, baseline };
    },
    [],
  );

  const getCycleBaselineForRequest = useCallback(
    (domain: ActivityCollaborationDomain, activityId: string) => {
      const active = cycleRef.current;
      if (!active || active.domain !== domain || active.activityId !== activityId) {
        return undefined;
      }
      return active.baseline;
    },
    [],
  );

  const getExistingCycleBaseline = useCallback(() => cycleRef.current?.baseline, []);

  const value = useMemo(
    () => ({
      impact,
      setImpact,
      dismissImpact,
      getCycleBaselineForRequest,
      getExistingCycleBaseline,
      setCycleBaseline,
      acknowledgeCommunicationSent,
    }),
    [
      impact,
      setImpact,
      dismissImpact,
      getCycleBaselineForRequest,
      getExistingCycleBaseline,
      setCycleBaseline,
      acknowledgeCommunicationSent,
    ],
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
