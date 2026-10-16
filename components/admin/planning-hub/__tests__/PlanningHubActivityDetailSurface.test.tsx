/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PlanningHubActivityDetailSurface from "../PlanningHubActivityDetailSurface";
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

describe("PlanningHubActivityDetailSurface", () => {
  it("does not render a separate info-button affordance on constrained cards", () => {
    render(
      <PlanningHubActivityDetailSurface
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
      </PlanningHubActivityDetailSurface>,
    );

    expect(screen.queryByTestId("planning-hub-activity-detail-touch-trigger")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Card" })).toBeInTheDocument();
  });

  it("wires hover detail for spacious individual cards (universal detail)", async () => {
    render(
      <PlanningHubActivityDetailSurface
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
      </PlanningHubActivityDetailSurface>,
    );

    const user = userEvent.setup();
    await user.hover(screen.getByRole("button", { name: "Card" }));
    expect(await screen.findByTestId("planning-hub-activity-detail")).toBeInTheDocument();
  });

  it("shows Planungsstatus with specific incomplete items on focus/hover (R5.5)", async () => {
    const user = userEvent.setup();
    render(
      <PlanningHubActivityDetailSurface
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
      </PlanningHubActivityDetailSurface>,
    );

    await user.tab();
    expect(await screen.findByTestId("planning-hub-activity-detail-planungsstatus")).toBeInTheDocument();
    expect(screen.getByText("Keine Garderobe zugewiesen")).toBeInTheDocument();
  });
});
