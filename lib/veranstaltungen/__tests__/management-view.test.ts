import { describe, expect, it } from "vitest";
import type { ClubEvent } from "@/lib/events/club-events-service";
import {
  computeVeranstaltungenKpis,
  filterVeranstaltungenEvents,
  partitionVeranstaltungenByTab,
} from "@/lib/veranstaltungen/management-view";

function event(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: "e1",
    title: "Generalversammlung",
    description: null,
    location: "Clubhaus",
    startAt: new Date("2099-06-01T18:00:00.000Z"),
    endAt: null,
    allDay: false,
    organizerName: null,
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
    seasonId: "s1",
    teamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    season: { id: "s1", key: "2026-27", name: "2026/27" },
    ...overrides,
  };
}

describe("veranstaltungen management-view", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");

  it("partitions tabs and computes KPIs from loaded events", () => {
    const events = [
      event({ id: "up", startAt: new Date("2099-01-01T10:00:00.000Z") }),
      event({ id: "past", startAt: new Date("2020-01-01T10:00:00.000Z") }),
      event({ id: "arch", status: "ARCHIVED", title: "Archiv" }),
    ];
    const kpis = computeVeranstaltungenKpis(events, now);
    expect(kpis.upcoming).toBe(1);
    expect(kpis.past).toBe(1);
    expect(kpis.total).toBe(2);
    expect(partitionVeranstaltungenByTab(events, "ARCHIV", now)).toHaveLength(1);
  });

  it("filters by search and location client-side", () => {
    const events = [
      event({ id: "a", title: "Trainersitzung", location: "Halle" }),
      event({ id: "b", title: "GV", location: "Clubhaus" }),
    ];
    const tabEvents = partitionVeranstaltungenByTab(events, "BEVORSTEHEND", now);
    const filtered = filterVeranstaltungenEvents(tabEvents, {
      search: "trainer",
      location: "Halle",
      review: "ALLE",
      publication: "ALLE",
      timeZone: "Europe/Zurich",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe("Trainersitzung");
  });
});
