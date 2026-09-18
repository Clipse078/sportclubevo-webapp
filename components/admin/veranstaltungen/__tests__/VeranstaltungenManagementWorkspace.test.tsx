/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/veranstaltungen",
  useSearchParams: () => new URLSearchParams(),
}));
import type { ClubEvent } from "@/lib/events/club-events-service";
import VeranstaltungenManagementWorkspace from "../VeranstaltungenManagementWorkspace";

function createEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: overrides.id ?? "event-1",
    title: overrides.title ?? "Event",
    description: null,
    location: "Clubhaus",
    startAt: overrides.startAt ?? new Date("2099-10-01T18:00:00.000Z"),
    endAt: null,
    allDay: false,
    organizerName: null,
    remarks: null,
    status: overrides.status ?? "SCHEDULED",
    reviewStage: "APPROVED",
    source: "MANUAL",
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: false,
    trainingsplanVisible: false,
    teamPageVisible: false,
    tenantId: "tenant-1",
    seasonId: "season-1",
    teamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    season: { id: "season-1", key: "2026-27", name: "2026/27" },
    ...overrides,
  };
}

describe("VeranstaltungenManagementWorkspace", () => {
  it("shows events across multiple months without implicit month filter", () => {
    const events = [
      createEvent({ id: "oct", title: "Oktober Event", startAt: new Date("2099-10-15T10:00:00.000Z") }),
      createEvent({ id: "nov", title: "November Event", startAt: new Date("2099-11-05T10:00:00.000Z") }),
    ];

    render(
      <VeranstaltungenManagementWorkspace
        events={events}
        tab="BEVORSTEHEND"
        canManage
        timeZone="Europe/Zurich"
        monthParam={null}
        calMonthParam={null}
      />,
    );

    expect(screen.getByText("Oktober Event")).toBeInTheDocument();
    expect(screen.getByText("November Event")).toBeInTheDocument();
  });

  it("scopes list to explicit month filter only", () => {
    const events = [
      createEvent({ id: "oct", title: "Oktober Event", startAt: new Date("2099-10-15T10:00:00.000Z") }),
      createEvent({ id: "nov", title: "November Event", startAt: new Date("2099-11-05T10:00:00.000Z") }),
    ];

    render(
      <VeranstaltungenManagementWorkspace
        events={events}
        tab="BEVORSTEHEND"
        canManage
        timeZone="Europe/Zurich"
        monthParam="2099-10"
      />,
    );

    expect(screen.getByText("Oktober Event")).toBeInTheDocument();
    expect(screen.queryByText("November Event")).toBeNull();
  });

  it("reset link clears month filter", () => {
    render(
      <VeranstaltungenManagementWorkspace
        events={[createEvent()]}
        tab="BEVORSTEHEND"
        canManage
        timeZone="Europe/Zurich"
        monthParam="2099-10"
        searchQuery="test"
      />,
    );

    const reset = screen.getByTestId("veranstaltungen-filter-reset");
    expect(reset).toHaveAttribute("href", "/dashboard/veranstaltungen");
  });
});
