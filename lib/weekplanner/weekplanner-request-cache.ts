/**
 * Request-scoped Weekplanner reads — kept separate from lib/server/request-cache
 * to avoid a circular import with lib/weekplanner/queries.ts.
 */

import { cache } from "react";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import type { WeekplannerWindow } from "@/lib/weekplanner/queries";

export const getWeekplannerWeekCached = cache(
  (
    tenantId: string,
    weekParam: string,
    daysKey: string,
    fromMs: number,
    toMs: number,
    previousParam: string,
    nextParam: string,
    planId: string | null,
  ) => {
    const window: WeekplannerWindow = {
      from: new Date(fromMs),
      to: new Date(toMs),
      days: daysKey.split(","),
      param: weekParam,
      previousParam,
      nextParam,
    };
    return getWeekplannerWeek(tenantId, window, planId ?? undefined);
  },
);
