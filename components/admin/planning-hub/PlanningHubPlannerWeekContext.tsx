"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyTrainingCancellationToPlannerWeek } from "@/lib/planning-hub/training-cancellation-reconciliation";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";

export type PlanningHubPlannerWeekContextValue = {
  week: WeekplannerWeek;
  notifyTrainingSessionCancelled: (trainingSessionId: string) => void;
  plannerSyncWarning: string | null;
  reportPlannerSyncWarning: (message: string) => void;
  clearPlannerSyncWarning: () => void;
};

const PlanningHubPlannerWeekContext = createContext<PlanningHubPlannerWeekContextValue | null>(
  null,
);

export function usePlanningHubPlannerWeek(): PlanningHubPlannerWeekContextValue | null {
  return useContext(PlanningHubPlannerWeekContext);
}

type ProviderProps = {
  serverWeek: WeekplannerWeek;
  timezone: string;
  children: ReactNode;
};

export function PlanningHubPlannerWeekProvider({
  serverWeek,
  timezone,
  children,
}: ProviderProps) {
  const [reconciledWeek, setReconciledWeek] = useState<WeekplannerWeek | null>(null);
  const [plannerSyncWarning, setPlannerSyncWarning] = useState<string | null>(null);

  useEffect(() => {
    setReconciledWeek(null);
    setPlannerSyncWarning(null);
  }, [serverWeek]);

  const week = reconciledWeek ?? serverWeek;

  const notifyTrainingSessionCancelled = useCallback(
    (trainingSessionId: string) => {
      setReconciledWeek((current) =>
        applyTrainingCancellationToPlannerWeek(
          current ?? serverWeek,
          trainingSessionId,
          timezone,
        ),
      );
    },
    [serverWeek, timezone],
  );

  const reportPlannerSyncWarning = useCallback((message: string) => {
    setPlannerSyncWarning(message.trim() || null);
  }, []);

  const clearPlannerSyncWarning = useCallback(() => {
    setPlannerSyncWarning(null);
  }, []);

  const value = useMemo(
    (): PlanningHubPlannerWeekContextValue => ({
      week,
      notifyTrainingSessionCancelled,
      plannerSyncWarning,
      reportPlannerSyncWarning,
      clearPlannerSyncWarning,
    }),
    [
      week,
      notifyTrainingSessionCancelled,
      plannerSyncWarning,
      reportPlannerSyncWarning,
      clearPlannerSyncWarning,
    ],
  );

  return (
    <PlanningHubPlannerWeekContext.Provider value={value}>
      {children}
    </PlanningHubPlannerWeekContext.Provider>
  );
}
