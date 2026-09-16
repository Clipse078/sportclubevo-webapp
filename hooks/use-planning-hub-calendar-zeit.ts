"use client";

/**
 * PLANNING-HUB-02E — daypart (`zeit`) as client presentation state with URL sync.
 * Avoids full App Router navigations that refetch canonical week data.
 */

import { useCallback, useEffect, useState } from "react";
import type { PlanningHubCalendarZeitParam } from "@/lib/planning-hub/planning-dayparts";
import {
  hrefForCalendarZeit,
  mergeCalendarZeitIntoUrlState,
  readCalendarZeitFromSearch,
} from "@/lib/planning-hub/calendar-zeit-url";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";

type Options = {
  timeZone: string;
};

export function usePlanningHubCalendarZeit(
  serverUrlState: PlanningHubUrlState,
  { timeZone }: Options,
): {
  urlState: PlanningHubUrlState;
  setCalendarZeit: (zeit: PlanningHubCalendarZeitParam) => void;
} {
  const [calendarZeit, setCalendarZeitState] = useState<PlanningHubCalendarZeitParam | undefined>(
    serverUrlState.calendarZeit,
  );

  const weekAnchor = serverUrlState.week ?? "";

  useEffect(() => {
    setCalendarZeitState(serverUrlState.calendarZeit);
  }, [weekAnchor, serverUrlState.plan, serverUrlState.perspective, serverUrlState.calendarZeit]);

  useEffect(() => {
    function onPopState() {
      const fromUrl = readCalendarZeitFromSearch(window.location.search, { timeZone });
      setCalendarZeitState(fromUrl);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [timeZone]);

  const setCalendarZeit = useCallback(
    (zeit: PlanningHubCalendarZeitParam) => {
      setCalendarZeitState(zeit);
      const href = hrefForCalendarZeit(serverUrlState, zeit);
      window.history.pushState({ planningHubZeit: zeit }, "", href);
    },
    [serverUrlState],
  );

  const urlState = mergeCalendarZeitIntoUrlState(serverUrlState, calendarZeit);

  return { urlState, setCalendarZeit };
}
