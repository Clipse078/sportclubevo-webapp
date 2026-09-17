import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindMany: vi.fn(),
  allocationDisplay: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { event: { findMany: mocks.eventFindMany } },
}));
vi.mock("@/lib/facilities/display-helpers", () => ({
  batchGetEventAllocationDisplayForTenant: mocks.allocationDisplay,
}));

import { getPublicEvents } from "../public-event-feed";

describe("SECURITY-GO-LIVE-01H-C — public Event tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventFindMany.mockResolvedValue([]);
    mocks.allocationDisplay.mockResolvedValue([]);
  });

  it("fails closed without a resolved public tenant", async () => {
    await expect(getPublicEvents({ surface: "infoboard" })).resolves.toEqual([]);
    expect(mocks.eventFindMany).not.toHaveBeenCalled();
  });

  it("constrains public InfoBoard events and related Teams to one tenant", async () => {
    await getPublicEvents({ surface: "infoboard", tenantId: "tenant-a" });

    expect(mocks.eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          AND: [
            {
              OR: [
                { teamId: null },
                { team: { tenantId: "tenant-a" } },
              ],
            },
          ],
        }),
      }),
    );
  });

  it("binds a manipulated team slug to the resolved tenant", async () => {
    await getPublicEvents({
      surface: "infoboard",
      tenantId: "tenant-a",
      teamSlug: "tenant-b-team",
    });

    expect(mocks.eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          team: { slug: "tenant-b-team", tenantId: "tenant-a" },
        }),
      }),
    );
  });

  it("maps optional allDay on public feed rows (SCE-EVENTS-01 backward compatible)", async () => {
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "evt-1",
        title: "Sommerfest",
        description: null,
        location: null,
        type: "OTHER",
        source: "MANUAL",
        status: "SCHEDULED",
        startAt: new Date("2026-09-25T22:00:00.000Z"),
        endAt: new Date("2026-09-26T22:00:00.000Z"),
        allDay: true,
        opponentName: null,
        organizerName: null,
        competitionLabel: null,
        homeAway: null,
        resultLabel: null,
        meetingTime: null,
        websiteVisible: true,
        infoboardVisible: true,
        homepageVisible: false,
        wochenplanVisible: true,
        trainingsplanVisible: false,
        teamPageVisible: false,
        remarks: null,
        pitchCode: null,
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
        season: null,
        team: null,
      },
      {
        id: "evt-2",
        title: "Legacy timed",
        description: null,
        location: null,
        type: "OTHER",
        source: "MANUAL",
        status: "SCHEDULED",
        startAt: new Date("2026-09-25T17:00:00.000Z"),
        endAt: null,
        allDay: null,
        opponentName: null,
        organizerName: null,
        competitionLabel: null,
        homeAway: null,
        resultLabel: null,
        meetingTime: null,
        websiteVisible: true,
        infoboardVisible: true,
        homepageVisible: false,
        wochenplanVisible: true,
        trainingsplanVisible: false,
        teamPageVisible: false,
        remarks: null,
        pitchCode: null,
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
        season: null,
        team: null,
      },
    ]);

    const events = await getPublicEvents({ surface: "infoboard", tenantId: "tenant-a" });
    expect(events.find((e) => e.id === "evt-1")?.allDay).toBe(true);
    expect(events.find((e) => e.id === "evt-2")?.allDay).toBe(false);
  });

  it("preserves InfoBoard publication and status predicates", async () => {
    await getPublicEvents({ surface: "infoboard", tenantId: "tenant-a" });

    expect(mocks.eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ infoboardVisible: true }, { type: "OTHER" }],
          status: { in: ["SCHEDULED", "LIVE", "COMPLETED", "POSTPONED"] },
        }),
      }),
    );
  });
});
