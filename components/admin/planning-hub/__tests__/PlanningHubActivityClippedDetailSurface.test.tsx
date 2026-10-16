/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlanningHubActivityClippedDetailSurface from "../PlanningHubActivityClippedDetailSurface";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const item: WeekplannerTrainingItem = {
  id: "t1",
  tenantId: "tenant",
  type: "TRAINING",
  startAt: new Date("2026-10-05T15:00:00.000Z"),
  endAt: new Date("2026-10-05T16:30:00.000Z"),
  canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
  canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
  timeOverridden: false,
  title: "Training",
  teamNames: ["Team A"],
  pitchAllocations: [
    {
      facilityResourceId: "r1",
      facilityId: "f1",
      code: "A",
      name: "Hauptfeld A",
      facilityName: "Hauptfeld",
      resourceType: "HALF_PITCH",
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    },
  ],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  conflicts: [],
  dressingRoomOccupancyMode: "DEFAULT",
  dressingRoomOccupancyBeforeMinutes: null,
  dressingRoomOccupancyAfterMinutes: null,
  dressingRoomResolvedBeforeMinutes: 0,
  dressingRoomResolvedAfterMinutes: 0,
  trainingSeriesId: "s1",
  trainingSessionId: "t1",
  teamSeasonId: "ts1",
};

describe("PlanningHubActivityClippedDetailSurface", () => {
  it("does not render a separate info-button affordance on constrained cards", () => {
    render(
      <PlanningHubActivityClippedDetailSurface
        item={item}
        locale="de-CH"
        timezone="Europe/Zurich"
        geometry={{ compact: true, blockWidthPx: 80, blockHeightPx: 34 }}
      >
        {(props) => (
          <button type="button" {...props}>
            Card
          </button>
        )}
      </PlanningHubActivityClippedDetailSurface>,
    );

    expect(screen.queryByTestId("planning-hub-activity-detail-touch-trigger")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Card" })).toBeInTheDocument();
  });

  it("omits detail wiring when block is spacious", () => {
    render(
      <PlanningHubActivityClippedDetailSurface
        item={item}
        locale="de-CH"
        timezone="Europe/Zurich"
        geometry={{ compact: false, blockWidthPx: 200, blockHeightPx: 80 }}
      >
        {(props) => (
          <button type="button" {...props}>
            Card
          </button>
        )}
      </PlanningHubActivityClippedDetailSurface>,
    );

    expect(screen.queryByTestId("planning-hub-activity-detail-touch-trigger")).not.toBeInTheDocument();
  });
});
