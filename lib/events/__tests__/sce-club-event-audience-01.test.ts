import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildSceClubEventAudiencePresentation } from "@/lib/events/club-event-organisational-audience-presentation";
import {
  normalizeClubEventOrganisationalAudienceInput,
  prepareClubEventOrganisationalAudienceWrite,
} from "@/lib/events/club-event-organisational-audience-service";
import {
  isClubEventRelevantToOrgUnit,
  isClubEventRelevantToTeam,
} from "@/lib/events/club-event-programme-eligibility";
import { parseClubEventOrganisationalAudienceFromApiBody } from "@/lib/events/club-event-organisational-audience-api";
import { ClubEventValidationError } from "@/lib/events/club-events-service";

const mocks = vi.hoisted(() => ({
  teamFindMany: vi.fn(),
  orgUnitFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    team: { findMany: mocks.teamFindMany },
    orgUnit: { findMany: mocks.orgUnitFindMany },
    event: { findFirst: vi.fn(), update: vi.fn() },
    clubEventOrganisationalAudienceTeam: { deleteMany: vi.fn(), createMany: vi.fn() },
    clubEventOrganisationalAudienceOrgUnit: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        event: { update: vi.fn() },
        clubEventOrganisationalAudienceTeam: { deleteMany: vi.fn(), createMany: vi.fn() },
        clubEventOrganisationalAudienceOrgUnit: { deleteMany: vi.fn(), createMany: vi.fn() },
      }),
    ),
  },
}));

describe("SCE-CLUB-EVENT-AUDIENCE-01", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes CLUB_WIDE to empty targets", () => {
    const normalized = normalizeClubEventOrganisationalAudienceInput({ scope: "CLUB_WIDE" });
    expect(normalized.scope).toBe("CLUB_WIDE");
    expect(normalized.refs).toHaveLength(0);
  });

  it("rejects SELECTED_ORG_UNITS without targets", () => {
    expect(() =>
      normalizeClubEventOrganisationalAudienceInput({ scope: "SELECTED_ORG_UNITS", teamIds: [] }),
    ).toThrow(ClubEventValidationError);
  });

  it("deduplicates mixed team/org targets", async () => {
    mocks.teamFindMany.mockResolvedValue([
      { id: "t1", tenantId: "tenant-a", isActive: true, name: "Junioren F2", displayNameOverride: null },
    ]);
    mocks.orgUnitFindMany.mockResolvedValue([
      {
        id: "o1",
        tenantId: "tenant-a",
        name: "Junioren",
        status: "ACTIVE",
        archivedAt: null,
      },
    ]);

    const prepared = await prepareClubEventOrganisationalAudienceWrite("tenant-a", {
      scope: "SELECTED_ORG_UNITS",
      targets: [
        { kind: "TEAM", id: "t1" },
        { kind: "TEAM", id: "t1" },
        { kind: "ORG_UNIT", id: "o1" },
      ],
    });
    expect(prepared.labeledTargets).toHaveLength(2);
  });

  it("fails closed on foreign-tenant team references", async () => {
    mocks.teamFindMany.mockResolvedValue([
      { id: "t1", tenantId: "tenant-b", isActive: true, name: "Foreign", displayNameOverride: null },
    ]);
    mocks.orgUnitFindMany.mockResolvedValue([]);

    await expect(
      prepareClubEventOrganisationalAudienceWrite("tenant-a", {
        scope: "SELECTED_ORG_UNITS",
        teamIds: ["t1"],
      }),
    ).rejects.toThrow(ClubEventValidationError);
  });

  it("builds presentation labels without persisting display strings", () => {
    const audience = buildSceClubEventAudiencePresentation({
      scope: "SELECTED_ORG_UNITS",
      targets: [
        { kind: "TEAM", id: "t1", label: "Junioren F1" },
        { kind: "TEAM", id: "t2", label: "Junioren F2" },
      ],
    });
    expect(audience.primaryLabel).toBe("Junioren F1 · Junioren F2");
    expect(audience.compactLabel).toBe("2 Teams");
  });

  it("programme eligibility uses exact org unit membership — not descendants", () => {
    const audience = {
      scope: "SELECTED_ORG_UNITS" as const,
      teamIds: ["team-1"],
      orgUnitIds: ["org-junioren"],
    };
    expect(isClubEventRelevantToTeam(audience, "team-1")).toBe(true);
    expect(isClubEventRelevantToTeam(audience, "team-2")).toBe(false);
    expect(isClubEventRelevantToOrgUnit(audience, "org-junioren")).toBe(true);
    expect(isClubEventRelevantToOrgUnit(audience, "org-junioren-f1")).toBe(false);
    expect(isClubEventRelevantToTeam({ scope: "CLUB_WIDE", teamIds: [], orgUnitIds: [] }, "any")).toBe(
      true,
    );
  });

  it("parses API audience payload", () => {
    const parsed = parseClubEventOrganisationalAudienceFromApiBody({
      scope: "SELECTED_ORG_UNITS",
      targets: [{ kind: "ORG_UNIT", id: "ou-1" }],
    });
    expect(parsed?.scope).toBe("SELECTED_ORG_UNITS");
    expect(parsed?.targets).toEqual([{ kind: "ORG_UNIT", id: "ou-1" }]);
  });

  it("documents domain separation — audience scope enum distinct from publication flags", () => {
    const publication = {
      websiteVisible: true,
      homepageVisible: false,
      wochenplanVisible: true,
    };
    const audience = normalizeClubEventOrganisationalAudienceInput({
      scope: "SELECTED_ORG_UNITS",
      orgUnitIds: ["ou-1"],
    });
    expect(publication.websiteVisible).toBe(true);
    expect(audience.scope).toBe("SELECTED_ORG_UNITS");
    expect(Object.keys(publication)).not.toContain("scope");
  });
});
