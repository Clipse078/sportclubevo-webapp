"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import WeekPlannerChrome, { type WeekPlannerChromeProps } from "./WeekPlannerChrome";

export type PlannerWeekChromeBridgePayload = {
  week?: WeekplannerWeek;
  teamOptions?: { value: string; label: string }[];
  facilityOptions?: { value: string; label: string }[];
  incompleteCount?: number;
  onReviewConflicts?: (incidents: PlanningConflictIncident[]) => void;
};

const BridgeContext = createContext<Dispatch<SetStateAction<PlannerWeekChromeBridgePayload>> | null>(
  null,
);

export function usePlannerWeekChromeBridge(payload: PlannerWeekChromeBridgePayload) {
  const setBridge = useContext(BridgeContext);

  useEffect(() => {
    if (!setBridge) return;
    setBridge((prev) => ({
      ...prev,
      ...payload,
    }));
  }, [
    setBridge,
    payload.week?.param,
    payload.teamOptions,
    payload.facilityOptions,
    payload.incompleteCount,
    payload.onReviewConflicts,
  ]);
}

type PlannerWeekStreamingRootProps = Omit<
  WeekPlannerChromeProps,
  "week" | "teamOptions" | "facilityOptions" | "incompleteCount" | "onReviewConflicts"
> & {
  children: ReactNode;
};

export default function PlannerWeekStreamingRoot({
  children,
  ...chromeProps
}: PlannerWeekStreamingRootProps) {
  const [bridge, setBridge] = useState<PlannerWeekChromeBridgePayload>({});

  const mergedChrome: WeekPlannerChromeProps = {
    ...chromeProps,
    week: bridge.week,
    teamOptions: bridge.teamOptions ?? [],
    facilityOptions: bridge.facilityOptions ?? [],
    incompleteCount: bridge.incompleteCount ?? 0,
    onReviewConflicts: bridge.onReviewConflicts,
  };

  const plannerReady = Boolean(bridge.week);

  return (
    <BridgeContext.Provider value={setBridge}>
      <div className="space-y-2" data-testid="planning-hub-workspace">
        {plannerReady ? <WeekPlannerChrome {...mergedChrome} /> : null}
        {children}
      </div>
    </BridgeContext.Provider>
  );
}

export function usePublishPlannerWeekChrome() {
  const setBridge = useContext(BridgeContext);
  return useCallback(
    (patch: PlannerWeekChromeBridgePayload) => {
      setBridge?.((prev) => ({ ...prev, ...patch }));
    },
    [setBridge],
  );
}
