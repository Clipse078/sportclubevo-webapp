/**
 * Tournament Center — publication channel contract at the public feed query boundary.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: mockFindMany },
  },
}));

vi.mock("@/lib/facilities/display-helpers", () => ({
  batchGetEventAllocationDisplayForTenant: vi.fn().mockResolvedValue([]),
}));

const { getPublicEvents } = await import("../public-event-feed");

const TENANT = "tenant-fca";
const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const BASE_ROW = {
  id: "evt-1",
  title: "Test Turnier",
  description: null,
  location: null,
  type: "TOURNAMENT",
  source: "MANUAL",
  status: "SCHEDULED",
  startAt: FUTURE,
  endAt: null,
  opponentName: null,
  organizerName: null,
  competitionLabel: null,
  homeAway: "HOME",
  resultLabel: null,
  meetingTime: null,
  websiteVisible: true,
  infoboardVisible: true,
  homepageVisible: true,
  wochenplanVisible: true,
  trainingsplanVisible: false,
  teamPageVisible: true,
  remarks: null,
  pitchCode: null,
  homeDressingRoomCode: null,
  awayDressingRoomCode: null,
  season: null,
  team: null,
};

function lastWhere() {
  return mockFindMany.mock.calls[mockFindMany.mock.calls.length - 1][0].where;
}

describe("tournament publication surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("website (all): requires websiteVisible", async () => {
    await getPublicEvents({
      surface: "all",
      tenantId: TENANT,
      eventTypes: ["TOURNAMENT"],
    });
    expect(lastWhere().websiteVisible).toBe(true);
  });

  it("wochenplan: requires websiteVisible and wochenplanVisible", async () => {
    await getPublicEvents({
      surface: "wochenplan",
      tenantId: TENANT,
      eventTypes: ["TOURNAMENT"],
    });
    expect(lastWhere().websiteVisible).toBe(true);
    expect(lastWhere().wochenplanVisible).toBe(true);
  });

  it("team-page: requires websiteVisible and teamPageVisible", async () => {
    await getPublicEvents({
      surface: "team-page",
      tenantId: TENANT,
      eventTypes: ["TOURNAMENT"],
    });
    expect(lastWhere().websiteVisible).toBe(true);
    expect(lastWhere().teamPageVisible).toBe(true);
  });

  it("infoboard: uses infoboardVisible OR manual types (not websiteVisible)", async () => {
    await getPublicEvents({
      surface: "infoboard",
      tenantId: TENANT,
      eventTypes: ["TOURNAMENT"],
    });
    expect(lastWhere().OR).toEqual([{ infoboardVisible: true }, { type: "OTHER" }]);
    expect(lastWhere()).not.toHaveProperty("websiteVisible");
  });

  it("homepage: tournaments require homepageVisible; matches do not", async () => {
    await getPublicEvents({
      surface: "homepage",
      tenantId: TENANT,
      eventTypes: ["TOURNAMENT"],
    });
    const where = lastWhere();
    expect(where.websiteVisible).toBe(true);
    expect(where).not.toHaveProperty("homepageVisible");
    const tournamentGate = (where.AND as Record<string, unknown>[]).find(
      (clause) =>
        typeof clause === "object" &&
        clause !== null &&
        "OR" in clause &&
        Array.isArray((clause as { OR: unknown[] }).OR),
    ) as { OR: unknown[] } | undefined;
    expect(tournamentGate?.OR).toEqual(
      expect.arrayContaining([
        { type: { in: ["MATCH", "TRAINING"] } },
        {
          AND: [{ type: { in: ["TOURNAMENT", "OTHER"] } }, { homepageVisible: true }],
        },
      ]),
    );
  });

});
