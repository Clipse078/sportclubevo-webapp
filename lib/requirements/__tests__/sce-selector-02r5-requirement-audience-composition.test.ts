/**
 * SCE-SELECTOR-02R5 — Requirement audience composition contracts (A–P).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  legacyFlatInputToRequirementAudienceComposition,
  resolveRequirementAudiencePersonIdsFromComposition,
  segmentsFromRequirementAudienceComposition,
} from "../requirement-audience-composition";
import { resolveRequirementAudiencePersonIdsFromSnapshotLegacyUnion } from "../requirement-audience";
import { allowedSourceTypesForSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";

const resolverMocks = vi.hoisted(() => ({
  resolveTeamAudiencePersonIds: vi.fn(),
  resolveOrgUnitAudiencePersonIds: vi.fn(),
  resolveRoleAudiencePersonIds: vi.fn(),
  resolveTargetGroupAudiencePersonIds: vi.fn(),
}));

vi.mock("@/lib/requirements/requirement-audience-resolvers", () => ({
  resolveTeamAudiencePersonIds: resolverMocks.resolveTeamAudiencePersonIds,
  resolveOrgUnitAudiencePersonIds: resolverMocks.resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds: resolverMocks.resolveRoleAudiencePersonIds,
  resolveTargetGroupAudiencePersonIds: resolverMocks.resolveTargetGroupAudiencePersonIds,
  mapTenantPersonIdsForUsers: vi.fn(),
}));

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-SELECTOR-02R5 requirement audience composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — direct person resolves to that person", async () => {
    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [{ term: { type: "PERSON", id: "michael" } }],
      excludePersonIds: [],
    });
    expect(ids).toEqual(["michael"]);
  });

  it("B — OR of two persons", async () => {
    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "PERSON", id: "a" } },
        { connector: "OR", term: { type: "PERSON", id: "b" } },
      ],
      excludePersonIds: [],
    });
    expect(ids.sort()).toEqual(["a", "b"]);
  });

  it("C/D/E — structural team/org/role expansion", async () => {
    resolverMocks.resolveTeamAudiencePersonIds.mockResolvedValue(["p-team"]);
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["p-org"]);
    resolverMocks.resolveRoleAudiencePersonIds.mockResolvedValue(["p-role"]);

    const team = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [{ term: { type: "TEAM", id: "f2" } }],
      excludePersonIds: [],
    });
    expect(team).toEqual(["p-team"]);

    const org = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [{ term: { type: "ORG_UNIT", id: "kf" } }],
      excludePersonIds: [],
    });
    expect(org).toEqual(["p-org"]);

    const role = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [{ term: { type: "ROLE", id: "trainer" } }],
      excludePersonIds: [],
    });
    expect(role).toEqual(["p-role"]);
  });

  it("C — Kinderfussball AND Club Admin intersects (not union)", async () => {
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["p1", "p2", "shared"]);
    resolverMocks.resolveRoleAudiencePersonIds.mockResolvedValue(["shared", "admin-only"]);

    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "ORG_UNIT", id: "kinderfussball" } },
        { connector: "AND", term: { type: "ROLE", id: "club-admin" } },
      ],
      excludePersonIds: [],
    });
    expect(ids).toEqual(["shared"]);
  });

  it("D — Kinderfussball OR Club Admin deduplicates union", async () => {
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["p1", "shared"]);
    resolverMocks.resolveRoleAudiencePersonIds.mockResolvedValue(["shared", "p2"]);

    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "ORG_UNIT", id: "kinderfussball" } },
        { connector: "OR", term: { type: "ROLE", id: "club-admin" } },
      ],
      excludePersonIds: [],
    });
    expect(ids.sort()).toEqual(["p1", "p2", "shared"].sort());
  });

  it("E — three-way AND intersects all expansions", async () => {
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["michael", "other"]);
    resolverMocks.resolveRoleAudiencePersonIds.mockResolvedValue(["michael", "admin"]);

    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "ORG_UNIT", id: "kinderfussball" } },
        { connector: "AND", term: { type: "ROLE", id: "club-admin" } },
        { connector: "AND", term: { type: "PERSON", id: "michael" } },
      ],
      excludePersonIds: [],
    });
    expect(ids).toEqual(["michael"]);
  });

  it("H — duplicate paths yield person once (direct AND structural)", async () => {
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["michael", "other"]);

    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "PERSON", id: "michael" } },
        { connector: "AND", term: { type: "ORG_UNIT", id: "kinderfussball" } },
      ],
      excludePersonIds: [],
    });
    expect(ids).toEqual(["michael"]);
  });

  it("F — Trainer AND Kinderfussball intersects person sets", async () => {
    resolverMocks.resolveRoleAudiencePersonIds.mockResolvedValue(["p1", "p2", "shared"]);
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["shared", "p3"]);

    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "ROLE", id: "trainer" } },
        { connector: "AND", term: { type: "ORG_UNIT", id: "kinderfussball" } },
      ],
      excludePersonIds: [],
    });
    expect(ids).toEqual(["shared"]);
  });

  it("G — (Trainer AND Kinderfussball) OR Sportleitung unions segments", async () => {
    resolverMocks.resolveRoleAudiencePersonIds
      .mockResolvedValueOnce(["t1", "both"])
      .mockResolvedValueOnce(["sport"]);
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["both"]);

    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "ROLE", id: "trainer" } },
        { connector: "AND", term: { type: "ORG_UNIT", id: "kinderfussball" } },
        { connector: "OR", term: { type: "ROLE", id: "sportleitung" } },
      ],
      excludePersonIds: [],
    });
    expect(ids.sort()).toEqual(["both", "sport"].sort());
  });

  it("H — exclusion removes explicit person from intersection result", async () => {
    resolverMocks.resolveRoleAudiencePersonIds.mockResolvedValue(["michael", "other"]);
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["michael", "other"]);

    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "ROLE", id: "trainer" } },
        { connector: "AND", term: { type: "ORG_UNIT", id: "kinderfussball" } },
      ],
      excludePersonIds: ["michael"],
    });
    expect(ids).toEqual(["other"]);
  });

  it("I — dedupe when same person reached via multiple OR segments", async () => {
    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [
        { term: { type: "PERSON", id: "p1" } },
        { connector: "OR", term: { type: "PERSON", id: "p1" } },
      ],
      excludePersonIds: [],
    });
    expect(ids).toEqual(["p1"]);
  });

  it("J — target group expansion uses canonical resolver", async () => {
    resolverMocks.resolveTargetGroupAudiencePersonIds.mockResolvedValue(["tg1", "tg2"]);
    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", {
      version: 1,
      conditions: [{ term: { type: "TARGET_GROUP", id: "zg-1" } }],
      excludePersonIds: [],
    });
    expect(ids).toEqual(["tg1", "tg2"]);
    expect(resolverMocks.resolveTargetGroupAudiencePersonIds).toHaveBeenCalledWith("tenant-a", ["zg-1"]);
  });

  it("O — legacy flat audience maps to OR-of-singletons (historical union)", async () => {
    resolverMocks.resolveTeamAudiencePersonIds.mockResolvedValue(["p2"]);
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["p2", "p3"]);

    const composition = legacyFlatInputToRequirementAudienceComposition({
      personIds: ["p1"],
      teamIds: ["team-1"],
      orgUnitIds: ["ou-1"],
    });

    expect(segmentsFromRequirementAudienceComposition(composition)).toHaveLength(3);

    const ids = await resolveRequirementAudiencePersonIdsFromComposition("tenant-a", composition);
    expect(ids.sort()).toEqual(["p1", "p2", "p3"].sort());

    vi.clearAllMocks();
    resolverMocks.resolveTeamAudiencePersonIds.mockResolvedValue(["p2"]);
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["p2", "p3"]);
    resolverMocks.resolveRoleAudiencePersonIds.mockResolvedValue([]);
    resolverMocks.resolveTargetGroupAudiencePersonIds.mockResolvedValue([]);

    const legacyUnion = await resolveRequirementAudiencePersonIdsFromSnapshotLegacyUnion("tenant-a", {
      persons: [{ personId: "p1" }],
      teams: [{ teamId: "team-1" }],
      orgUnits: [{ orgUnitId: "ou-1" }],
      roles: [],
      targetGroups: [],
    });
    expect(legacyUnion.sort()).toEqual(ids.sort());
  });

  it("UAT1 — builder highlights final Ergebnis, zero warning, and person preview toggle", () => {
    const builder = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(builder).toContain("requirement-audience-result-panel");
    expect(builder).toContain("requirement-audience-zero-warning");
    expect(builder).toContain("Mit dieser Kombination muss aktuell niemand bestätigen.");
    expect(builder).toContain("Personen anzeigen");
    expect(builder).toContain("AUSGESCHLOSSEN");
    expect(builder).toContain("Erweiterung:");
  });

  it("P — requirement builder uses canonical SCE recipient selector (no parallel pickers)", () => {
    const builder = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(builder).toContain("SceRecipientSelector");
    expect(builder).not.toContain("RequirementPersonMultiPicker");
    expect(builder).not.toContain("searchRequirementAudienceTeamsAction");
  });

  it("selector architecture — REQUIREMENT_AUDIENCE exposes structural + person sources", () => {
    expect(allowedSourceTypesForSelectorAuthorizationContext("REQUIREMENT_AUDIENCE")).toEqual([
      "PERSON",
      "TEAM",
      "ORG_UNIT",
      "ROLE",
      "TARGET_GROUP",
    ]);
  });
});
