import { describe, expect, it } from "vitest";
import type { ClubEvent } from "@/lib/events/club-events-service";
import {
  computeVeranstaltungenKpis,
  filterVeranstaltungenEvents,
  groupVeranstaltungenByMonth,
  partitionVeranstaltungenByTab,
} from "@/lib/veranstaltungen/management-view";
import { resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";

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

  it("groups months chronologically and filters only when month window provided", () => {
    const events = [
      event({ id: "nov", title: "Nov", startAt: new Date("2099-11-01T10:00:00.000Z") }),
      event({ id: "oct", title: "Oct", startAt: new Date("2099-10-01T10:00:00.000Z") }),
    ];
    const tabEvents = partitionVeranstaltungenByTab(events, "BEVORSTEHEND", now);
    const all = filterVeranstaltungenEvents(tabEvents, {
      search: "",
      location: null,
      review: "ALLE",
      publication: "ALLE",
      timeZone: "Europe/Zurich",
    });
    const groups = groupVeranstaltungenByMonth(all, "Europe/Zurich");
    expect(groups).toHaveLength(2);
    expect(groups[0]?.events[0]?.id).toBe("oct");
    expect(groups[1]?.events[0]?.id).toBe("nov");

    const monthWindow = resolveMatchcenterMonthWindow({
      monthParam: "2099-10",
      timeZone: "Europe/Zurich",
    });
    const scoped = filterVeranstaltungenEvents(tabEvents, {
      search: "",
      location: null,
      review: "ALLE",
      publication: "ALLE",
      monthFrom: monthWindow.from,
      monthTo: monthWindow.to,
      timeZone: "Europe/Zurich",
    });
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.id).toBe("oct");
  });
});
