/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ApprovedReleaseAssignmentPanel from "../ApprovedReleaseAssignmentPanel";

describe("ApprovedReleaseAssignmentPanel", () => {
  it("renders approved candidates with Aufbieten action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ squad: { selected: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onAssigned = vi.fn();
    render(
      <ApprovedReleaseAssignmentPanel
        eventId="event-1"
        variant="match"
        canMutateSquad
        onAssigned={onAssigned}
        candidates={[
          {
            requestId: "req-1",
            personId: "p1",
            personDisplayName: "SCE Testspieler 01",
            sourceTeamSeasonId: "ts-b1",
            sourceTeamLabel: "Junioren B1",
            statusLabel: "Genehmigt",
            availabilityLabel: "Offen",
            availabilityTone: "muted",
            conflictHints: [],
            canAssign: true,
            assignBlockedReason: null,
            assignWarning: null,
            version: "2026-10-11T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("approved-release-assignment")).toBeInTheDocument();
    expect(screen.getByText("SCE Testspieler 01")).toBeInTheDocument();
    expect(screen.getByText("Junioren B1")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("approved-release-assign-req-1"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/matchcenter/event-1/player-release-requests/req-1/assign",
      { method: "POST" },
    );
    expect(onAssigned).toHaveBeenCalled();
  });
});
