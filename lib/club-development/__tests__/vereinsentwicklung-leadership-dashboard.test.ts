import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  filterTargetsForOrgEinheit,
  targetMatchesOrgEinheitFilter,
  loadLeadershipMembershipKpis,
} from "../vereinsentwicklung-leadership-dashboard";
import { SCE_VEREINSENTWICKLUNG_LEADERSHIP_KPIS } from "../vereinsentwicklung-leadership-kpi-catalog";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const prismaMocks = vi.hoisted(() => ({
  personMembershipFindMany: vi.fn(),
  personMembershipCount: vi.fn(),
  personMembershipFindFirst: vi.fn(),
  personAssignmentFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    personMembership: {
      findMany: (...args: unknown[]) => prismaMocks.personMembershipFindMany(...args),
      count: (...args: unknown[]) => prismaMocks.personMembershipCount(...args),
      findFirst: (...args: unknown[]) => prismaMocks.personMembershipFindFirst(...args),
    },
    personAssignment: {
      findMany: (...args: unknown[]) => prismaMocks.personAssignmentFindMany(...args),
    },
  },
}));

function actor(overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: [PERMISSIONS.PEOPLE_VIEW],
    orgUnitIds: [],
    personId: null,
    roleKeys: [],
    teamIds: [],
    ...overrides,
  } as ActorContext;
}

describe("vereinsentwicklung leadership KPI catalog", () => {
  it("documents SCE KPI definitions for PO review", () => {
    expect(SCE_VEREINSENTWICKLUNG_LEADERSHIP_KPIS.map((k) => k.id)).toEqual([
      "mitgliederbestand",
      "eintritte",
      "austritte",
      "umsetzung_tasks",
      "ziel_delivery",
    ]);
  });
});

describe("target org filter", () => {
  it("matches visibleOrgUnitRefs", () => {
    expect(
      targetMatchesOrgEinheitFilter(
        { visibleOrgUnitRefs: ["ou-1", "ou-2"] } as Parameters<
          typeof targetMatchesOrgEinheitFilter
        >[0],
        "ou-2",
      ),
    ).toBe(true);
    expect(
      filterTargetsForOrgEinheit(
        [
          { id: "a", visibleOrgUnitRefs: ["ou-1"] },
          { id: "b", visibleOrgUnitRefs: ["ou-2"] },
        ] as Parameters<typeof filterTargetsForOrgEinheit>[0],
        { id: "ou-1", label: "Junioren" },
      ).map((t) => t.id),
    ).toEqual(["a"]);
  });
});

describe("membership headcount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes distinct active members club-wide", async () => {
    prismaMocks.personMembershipFindMany.mockResolvedValue([
      { personId: "p1" },
      { personId: "p2" },
    ]);
    prismaMocks.personMembershipFindFirst.mockResolvedValue({ updatedAt: new Date("2025-01-01") });
    prismaMocks.personMembershipCount.mockResolvedValue(0);
    prismaMocks.personMembershipFindFirst.mockResolvedValueOnce({ updatedAt: new Date("2025-01-01") });
    prismaMocks.personMembershipFindFirst.mockResolvedValueOnce(null);

    const result = await loadLeadershipMembershipKpis(actor(), null);
    expect(result.headcount).toBe(2);
    expect(result.accessible).toBe(true);
    expect(prismaMocks.personMembershipFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ["personId"] }),
    );
  });

  it("reports unavailable trend without substituting zero", async () => {
    prismaMocks.personMembershipFindMany.mockResolvedValue([]);
    prismaMocks.personMembershipFindFirst
      .mockResolvedValueOnce({ updatedAt: new Date("2025-06-01") })
      .mockResolvedValueOnce(null);
    prismaMocks.personMembershipCount.mockResolvedValue(0);

    const result = await loadLeadershipMembershipKpis(actor(), null);
    expect(result.trendKind).toBe("unavailable");
    expect(result.trendLabel).toBe("Keine Verlaufsdaten");
  });

  it("denies membership block without people.view", async () => {
    const result = await loadLeadershipMembershipKpis(actor({ permissionKeys: [] }), null);
    expect(result.accessible).toBe(false);
    expect(result.headcount).toBeNull();
  });
});