/**
 * @vitest-environment jsdom
 * SCE-PLANNER-UX-08-08B — server facility catalog props replace stale client state.
 */

import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WeekPlannerWorkspace from "../WeekPlannerWorkspace";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
import type { PlanningHubFacilityGroups } from "@/lib/planning-hub/fetch-facility-groups-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const publishChrome = vi.fn();
vi.mock("../PlannerWeekChromeBridge", () => ({
  usePublishPlannerWeekChrome: () => publishChrome,
}));

vi.mock("@/components/admin/planning-hub/PlanningHubCalendarView", () => ({
  default: () => <div data-testid="kalender" />,
}));

const emptyWeek: WeekplannerWeek = {
  param: "2026-10-05",
  previousParam: "2026-09-28",
  nextParam: "2026-10-12",
  weekNumberLabel: "KW 40",
  rangeLabel: "5.–11. Okt. 2026",
  days: [{ dayKey: "2026-10-09", items: [] }],
};

function catalog(label: string): PlanningHubFacilityGroups {
  return {
    PITCH_HALL: [
      {
        id: "f1",
        name: label,
        resources: [
          {
            id: "res-1",
            name: "Lane A",
            code: "A",
            type: "FULL_PITCH",
          },
        ],
      },
    ],
    DRESSING_ROOM: [],
  };
}

describe("WeekPlannerWorkspace facility groups sync", () => {
  it("publishes updated facility labels when server catalog prop changes", async () => {
    const { rerender } = render(
      <WeekPlannerWorkspace
        week={emptyWeek}
        urlState={{
          week: emptyWeek.param,
          perspective: "spielfeld",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
        resourceTimelineCatalog={catalog("Old name")}
      />,
    );

    await waitFor(() => {
      expect(publishChrome).toHaveBeenCalled();
    });

    const lastOld = publishChrome.mock.calls.at(-1)?.[0];
    expect(lastOld?.resourceTimelineCatalog?.PITCH_HALL[0]?.name).toBe("Old name");

    rerender(
      <WeekPlannerWorkspace
        week={emptyWeek}
        urlState={{
          week: emptyWeek.param,
          perspective: "spielfeld",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
        resourceTimelineCatalog={catalog("New name")}
      />,
    );

    await waitFor(() => {
      const lastNew = publishChrome.mock.calls.at(-1)?.[0];
      expect(lastNew?.resourceTimelineCatalog?.PITCH_HALL[0]?.name).toBe("New name");
    });

    const ids = publishChrome.mock.calls.map(
      (call) => call[0]?.resourceTimelineCatalog?.PITCH_HALL[0]?.resources[0]?.id,
    );
    expect(new Set(ids)).toEqual(new Set(["res-1"]));
  });
});
