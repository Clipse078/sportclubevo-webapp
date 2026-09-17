/**
 * SCE-EVENTS-01B3 — Veranstaltung homepage visibility contract at the public feed boundary.
 *
 * BEFORE: homepageVisible on OTHER was persisted in admin UI but not enforced by the homepage query.
 * AFTER: homepageVisible is authoritative for Veranstaltung homepage eligibility under websiteVisible.
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

const TENANT = "tenant-a";
const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

function lastWhere() {
  return mockFindMany.mock.calls[mockFindMany.mock.calls.length - 1][0].where;
}

function homepageTypeGate(where: Record<string, unknown>) {
  const andClauses = where.AND as Record<string, unknown>[] | undefined;
  const surfaceGate = andClauses?.find((clause) => {
    if (typeof clause !== "object" || clause === null || !("OR" in clause)) {
      return false;
    }
    const or = (clause as { OR: unknown[] }).OR;
    return or.some(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "type" in entry &&
        (entry as { type: { in?: string[] } }).type?.in?.includes("MATCH"),
    );
  }) as { OR: unknown[] } | undefined;
  return surfaceGate?.OR;
}

const BASE_OTHER_ROW = {
  id: "evt-club",
  title: "GV",
  description: null,
  location: null,
  type: "OTHER",
  source: "MANUAL",
  status: "SCHEDULED",
  startAt: FUTURE,
  endAt: null,
  allDay: false,
  opponentName: null,
  organizerName: null,
  competitionLabel: null,
  homeAway: null,
  resultLabel: null,
  meetingTime: null,
  websiteVisible: true,
  infoboardVisible: false,
  homepageVisible: true,
  wochenplanVisible: false,
  trainingsplanVisible: false,
  teamPageVisible: false,
  remarks: null,
  pitchCode: null,
  homeDressingRoomCode: null,
  awayDressingRoomCode: null,
  season: null,
  team: null,
};

describe("SCE-EVENTS-01B3 — Veranstaltung homepage contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("homepage query gates OTHER with homepageVisible under websiteVisible", async () => {
    await getPublicEvents({ surface: "homepage", tenantId: TENANT, eventTypes: ["OTHER"] });

    const where = lastWhere();
    expect(where.websiteVisible).toBe(true);
    expect(where).not.toHaveProperty("homepageVisible");
    expect(homepageTypeGate(where)).toEqual(
      expect.arrayContaining([
        { type: { in: ["MATCH", "TRAINING"] } },
        {
          AND: [{ type: { in: ["TOURNAMENT", "OTHER"] } }, { homepageVisible: true }],
        },
      ]),
    );
  });

  it("website club-events surface still requires websiteVisible only (homepage not required)", async () => {
    await getPublicEvents({ surface: "all", tenantId: TENANT, eventTypes: ["OTHER"] });

    const where = lastWhere();
    expect(where.websiteVisible).toBe(true);
    expect(where.homepageVisible).toBeUndefined();
    expect(where.wochenplanVisible).toBeUndefined();
  });

  it("website ON + homepage OFF → included on website feed query, excluded from homepage gate", async () => {
    await getPublicEvents({ surface: "all", tenantId: TENANT, eventTypes: ["OTHER"] });
    expect(lastWhere().websiteVisible).toBe(true);

    await getPublicEvents({ surface: "homepage", tenantId: TENANT, eventTypes: ["OTHER"] });
    const gate = homepageTypeGate(lastWhere());
    expect(gate).toEqual(
      expect.arrayContaining([
        {
          AND: [{ type: { in: ["TOURNAMENT", "OTHER"] } }, { homepageVisible: true }],
        },
      ]),
    );
  });

  it("website OFF excludes both website and homepage surfaces (fail closed on tenant)", async () => {
    await getPublicEvents({ surface: "all", tenantId: TENANT, eventTypes: ["OTHER"] });
    expect(lastWhere().websiteVisible).toBe(true);

    mockFindMany.mockResolvedValueOnce([]);
    await getPublicEvents({ surface: "homepage", tenantId: TENANT, eventTypes: ["OTHER"] });
    expect(lastWhere().websiteVisible).toBe(true);
  });

  it("maps homepage visibility on OTHER rows returned by the homepage query", async () => {
    mockFindMany.mockResolvedValue([BASE_OTHER_ROW]);

    const results = await getPublicEvents({
      surface: "homepage",
      tenantId: TENANT,
      eventTypes: ["OTHER"],
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.visibility.homepage).toBe(true);
  });

  it("wochenplan surface unchanged for OTHER", async () => {
    await getPublicEvents({ surface: "wochenplan", tenantId: TENANT, eventTypes: ["OTHER"] });

    const where = lastWhere();
    expect(where.websiteVisible).toBe(true);
    expect(where.wochenplanVisible).toBe(true);
    expect(where.homepageVisible).toBeUndefined();
  });

  it("infoboard surface unchanged for OTHER", async () => {
    await getPublicEvents({ surface: "infoboard", tenantId: TENANT, eventTypes: ["OTHER"] });

    const where = lastWhere();
    expect(where.OR).toEqual([{ infoboardVisible: true }, { type: "OTHER" }]);
    expect(where.websiteVisible).toBeUndefined();
  });

  it("tenant scoping unchanged on homepage", async () => {
    await getPublicEvents({ surface: "homepage", tenantId: TENANT, eventTypes: ["OTHER"] });
    expect(lastWhere().tenantId).toBe(TENANT);
  });
});

describe("SCE-EVENTS-01B3 — visibility matrix (query predicates)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("surface=all requires websiteVisible without homepage type gate", async () => {
    await getPublicEvents({ surface: "all", tenantId: TENANT, eventTypes: ["OTHER"] });
    const where = lastWhere();
    expect(where.websiteVisible).toBe(true);
    expect(homepageTypeGate(where)).toBeUndefined();
  });

  it("surface=homepage requires websiteVisible and homepage type gate for OTHER", async () => {
    await getPublicEvents({ surface: "homepage", tenantId: TENANT, eventTypes: ["OTHER"] });
    const where = lastWhere();
    expect(where.websiteVisible).toBe(true);
    expect(homepageTypeGate(where)).toEqual(
      expect.arrayContaining([
        {
          AND: [{ type: { in: ["TOURNAMENT", "OTHER"] } }, { homepageVisible: true }],
        },
      ]),
    );
  });
});

describe("SCE-EVENTS-01B3 — tournament homepage unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it("tournament homepage still uses homepageVisible gate", async () => {
    await getPublicEvents({ surface: "homepage", tenantId: TENANT, eventTypes: ["TOURNAMENT"] });

    const gate = homepageTypeGate(lastWhere());
    expect(gate).toEqual(
      expect.arrayContaining([
        {
          AND: [{ type: { in: ["TOURNAMENT", "OTHER"] } }, { homepageVisible: true }],
        },
      ]),
    );
  });
});
