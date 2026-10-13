/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import VeranstaltungListRow from "../VeranstaltungListRow";
import type { ClubEvent } from "@/lib/events/club-events-service";

function createEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: "ev-1",
    title: "118. Mitgliederversammlung",
    description: null,
    location: "Clubhaus",
    startAt: new Date("2026-10-24T17:00:00.000Z"),
    endAt: new Date("2026-10-24T20:00:00.000Z"),
    allDay: false,
    organizerName: "FC Allschwil",
    remarks: null,
    status: "SCHEDULED",
    reviewStage: "APPROVED",
    source: "MANUAL",
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: false,
    trainingsplanVisible: false,
    teamPageVisible: false,
    tenantId: "t1",
    seasonId: null,
    teamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    season: null,
    ...overrides,
  };
}

describe("VeranstaltungListRow composition (01G-R1)", () => {
  it("renders VERANSTALTUNG identity separately from context schedule/location", () => {
    render(<VeranstaltungListRow event={createEvent()} canManage />);
    expect(screen.getByText("VERANSTALTUNG")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-title")).toHaveTextContent("118. Mitgliederversammlung");
    expect(screen.getByTestId("veranstaltung-row-context-zone")).toBeTruthy();
    expect(screen.getByTestId("veranstaltung-row-context-time").textContent).toMatch(/19:00/);
    expect(screen.getByTestId("veranstaltung-row-context-location")).toHaveTextContent("Clubhaus");
    expect(screen.queryByTestId("sce-club-event-schedule")).toBeNull();
  });

  it("exposes club-event-violet on ActivityTypePill in identity zone", () => {
    render(<VeranstaltungListRow event={createEvent()} canManage />);
    const pill = screen.getByText("VERANSTALTUNG");
    expect(pill.getAttribute("data-activity-type-pill")).toBe("club-event-violet");
  });
});
