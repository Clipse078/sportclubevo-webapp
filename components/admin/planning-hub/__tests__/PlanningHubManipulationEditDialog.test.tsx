/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubManipulationEditDialog from "../PlanningHubManipulationEditDialog";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const ROOM_E1 = {
  facilityResourceId: "room-e1",
  facilityId: "f-dress",
  code: "E1",
  name: "E1",
  facilityName: "Garderobe",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 45,
};

const ROOM_E2 = {
  facilityResourceId: "room-e2",
  facilityId: "f-dress",
  code: "E2",
  name: "E2",
  facilityName: "Garderobe",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 45,
};

function matchItem(): WeekplannerItem {
  return {
    id: "match:m1",
    tenantId: "t1",
    type: "MATCH",
    eventId: "ev-1",
    startAt: new Date("2026-09-20T11:00:00.000Z"),
    endAt: new Date("2026-09-20T13:00:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T11:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T13:00:00.000Z"),
    timeOverridden: false,
    title: "Spiel",
    teamNames: ["D2"],
    pitchAllocations: [],
    dressingRoomAllocations: [ROOM_E1],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [ROOM_E1],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
  } as WeekplannerItem;
}

describe("PlanningHubManipulationEditDialog — non-DnD Planung ändern", () => {
  it("focuses resource select and opens VON/NACH confirmation on submit", async () => {
    const user = userEvent.setup();
    const onSubmitDraft = vi.fn();
    render(
      <PlanningHubManipulationEditDialog
        item={matchItem()}
        segmentId="dressing:0"
        resourceId={ROOM_E1.facilityResourceId}
        locale="de-CH"
        timezone="Europe/Zurich"
        resourceCategory="dressing"
        resourceOptions={[ROOM_E1, ROOM_E2]}
        onClose={vi.fn()}
        onSubmitDraft={onSubmitDraft}
        evaluateConflicts={() => ({ status: "valid", message: "Keine Konflikte.", newResourceConflictCount: 0 })}
      />,
    );

    const resourceSelect = screen.getByLabelText(/Ressource/i);
    expect(document.activeElement).toBe(resourceSelect);

    await user.selectOptions(resourceSelect, ROOM_E2.facilityResourceId);
    await user.click(screen.getByTestId("planning-hub-manipulation-edit-continue"));

    expect(screen.getByTestId("planning-hub-manipulation-confirm")).toBeTruthy();
    expect(screen.getByText("Von")).toBeTruthy();
    expect(screen.getByText("Nach")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-activity-unchanged")).toHaveTextContent(
      /Spielzeit.*unverändert/,
    );
  });

  it("returns to editor when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(
      <PlanningHubManipulationEditDialog
        item={matchItem()}
        segmentId="dressing:0"
        resourceId={ROOM_E1.facilityResourceId}
        locale="de-CH"
        timezone="Europe/Zurich"
        resourceCategory="dressing"
        resourceOptions={[ROOM_E1, ROOM_E2]}
        onClose={vi.fn()}
        onSubmitDraft={vi.fn()}
        evaluateConflicts={() => ({ status: "valid", message: "OK", newResourceConflictCount: 0 })}
      />,
    );

    await user.click(screen.getByTestId("planning-hub-manipulation-edit-continue"));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(screen.getByTestId("planning-hub-manipulation-edit")).toBeTruthy();
    expect(screen.queryByTestId("planning-hub-manipulation-confirm")).toBeNull();
  });

  it("submits draft through confirm apply (same pipeline as DnD)", async () => {
    const user = userEvent.setup();
    const onSubmitDraft = vi.fn();
    render(
      <PlanningHubManipulationEditDialog
        item={matchItem()}
        segmentId="dressing:0"
        resourceId={ROOM_E1.facilityResourceId}
        locale="de-CH"
        timezone="Europe/Zurich"
        resourceCategory="dressing"
        resourceOptions={[ROOM_E1, ROOM_E2]}
        onClose={vi.fn()}
        onSubmitDraft={onSubmitDraft}
        evaluateConflicts={() => ({ status: "valid", message: "OK", newResourceConflictCount: 0 })}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Ressource/i), ROOM_E2.facilityResourceId);
    await user.click(screen.getByTestId("planning-hub-manipulation-edit-continue"));
    await user.click(screen.getByTestId("planning-hub-manipulation-confirm-apply"));

    expect(onSubmitDraft).toHaveBeenCalledTimes(1);
    expect(onSubmitDraft.mock.calls[0]![0].proposedResourceId).toBe(ROOM_E2.facilityResourceId);
    expect(onSubmitDraft.mock.calls[0]![0].timeTarget).toBe("resourceOccupancy");
  });
});
