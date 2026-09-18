/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClubEvent } from "@/lib/events/club-events-service";
import VeranstaltungenOverview from "@/components/admin/veranstaltungen/VeranstaltungenOverview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/veranstaltungen",
  useSearchParams: () => new URLSearchParams(),
}));

function createEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: overrides.id ?? "event-1",
    title: overrides.title ?? "Generalversammlung",
    description: null,
    location: "Clubhaus",
    startAt: new Date("2026-10-01T18:00:00.000Z"),
    endAt: null,
    allDay: false,
    organizerName: "Vorstand",
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
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    season: { id: "season-1", key: "2026-27", name: "2026/27" },
    ...overrides,
  };
}

describe("VeranstaltungenOverview", () => {
  it("renders Bevorstehend/Vergangen/Archiv tabs without legacy hero chrome", () => {
    const events = [
      createEvent({ id: "future-1", title: "Trainersitzung", startAt: new Date("2099-10-01T18:00:00.000Z") }),
      createEvent({ id: "archived-1", title: "Altanlass", status: "ARCHIVED" }),
    ];

    render(
      <VeranstaltungenOverview
        events={events}
        tab="BEVORSTEHEND"
        canManage
        monthParam="2099-10"
        currentMonthParam="2026-09"
      />,
    );

    expect(screen.getByTestId("veranstaltungen-tab-bevorstehend")).toBeInTheDocument();
    expect(screen.getByTestId("veranstaltungen-tab-vergangen")).toBeInTheDocument();
    expect(screen.getByTestId("veranstaltungen-tab-archiv")).toBeInTheDocument();
    expect(screen.queryByText("TOTAL")).toBeNull();
    expect(screen.getByText("Trainersitzung")).toBeInTheDocument();
    expect(screen.queryByText("Altanlass")).toBeNull();
  });

  it("renders planning management shell with KPIs, search, and filter rail", () => {
    const events = [
      createEvent({
        id: "future-1",
        title: "Sponsorenanlass",
        startAt: new Date("2099-10-01T18:00:00.000Z"),
      }),
    ];

    render(
      <VeranstaltungenOverview
        events={events}
        tab="BEVORSTEHEND"
        canManage
        monthParam="2099-10"
        currentMonthParam="2026-09"
      />,
    );

    expect(screen.getByTestId("veranstaltungen-management-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("veranstaltungen-kpi-cards")).toBeInTheDocument();
    expect(screen.getByTestId("veranstaltungen-search")).toBeInTheDocument();
    expect(screen.getByTestId("veranstaltungen-management-rail")).toBeInTheDocument();
    expect(screen.getByTestId("spiele-month-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("veranstaltungen-filter-rail")).toBeInTheDocument();
    expect(screen.getByText("Planung")).toBeInTheDocument();
    expect(screen.getByTestId("veranstaltungen-create-link")).toBeInTheDocument();
  });
});
