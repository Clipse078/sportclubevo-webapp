import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatSceActivityLocationHierarchy } from "../location-format";
import { resolveSceTournamentPresentationFromWeekplannerTournament } from "../adapters/weekplanner-tournament";
import type { WeekplannerTournamentItem } from "@/lib/weekplanner/types";

const repoRoot = process.cwd();

describe("SCE-UI-ROLLOUT-01F — architecture guardrails", () => {
  it("documents canonical Tournament card in SCE-DESIGN-SYSTEM.md", () => {
    const doc = readFileSync(join(repoRoot, "docs/design/SCE-DESIGN-SYSTEM.md"), "utf8");
    expect(doc).toContain("SceTournamentCard");
    expect(doc).toContain("Canonical Tournament card family");
  });

  it("uses a single canonical SceTournamentCard module", () => {
    const source = readFileSync(
      join(repoRoot, "components/sporting-activity/SceTournamentCard.tsx"),
      "utf8",
    );
    expect(source).toContain("SceTournamentPresentationModel");
    expect(source).not.toContain("TournamentCardModel");
    expect(source).not.toContain("TournamentPresentationModelV2");
    expect(source).toContain("data-sce-tournament-density");
    expect(source).toContain("ClubCrest");
    expect(source).not.toMatch(/function\s+SceTournamentHero/);
    expect(source).not.toContain("fixture");
    expect(source).not.toContain(" VS ");
    expect(source).not.toMatch(/\bhomeLeftAwayRight\b/);
    expect(source).not.toMatch(/resolveTournamentOrganiserClubLogoUrl/);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("weekplanner adapter maps HOME tournament item to canonical model", () => {
    const item: WeekplannerTournamentItem = {
      id: "tournament:ev-1",
      tenantId: "t1",
      type: "TOURNAMENT",
      startAt: new Date("2026-10-12T07:30:00.000Z"),
      endAt: new Date("2026-10-12T09:30:00.000Z"),
      canonicalStartAt: new Date("2026-10-12T07:30:00.000Z"),
      canonicalEndAt: new Date("2026-10-12T09:30:00.000Z"),
      timeOverridden: false,
      title: "Junioren F Turnier",
      teamNames: ["Junioren F2"],
      pitchAllocations: [
        {
          facilityResourceId: "r1",
          facilityId: "f1",
          code: "P1",
          name: "Platz 1",
          facilityName: "Gemeindesportplatz",
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        },
      ],
      dressingRoomAllocations: [],
      canonicalPitchAllocations: [],
      canonicalDressingRoomAllocations: [],
      pitchOverridden: false,
      dressingRoomOverridden: false,
      conflicts: [],
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomOccupancyBeforeMinutes: null,
      dressingRoomOccupancyAfterMinutes: null,
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
      eventId: "ev-1",
      homeAway: "HOME",
      teamSeasonIds: ["ts-1"],
      participantAllocations: [],
    };
    const model = resolveSceTournamentPresentationFromWeekplannerTournament({
      ...item,
      organizerName: "FC Allschwil",
      organizerLogoUrl: "/images/logos/fc-allschwil.png",
    });
    expect(model.kind).toBe("TOURNAMENT");
    expect(model.organiser.displayName).toBe("FC Allschwil");
    expect(model.organiser.logoUrl).toBe("/images/logos/fc-allschwil.png");
    expect(model.hauptteam?.name).toBe("Junioren F2");
    expect(formatSceActivityLocationHierarchy(
      { ...model.location, hostOrOrganiser: undefined },
      { includeHostClub: false },
    )).toBe("Gemeindesportplatz · Platz 1");
  });

  it("representative consumers import SceTournamentCard", () => {
    const paths = [
      "components/admin/tournamentcenter/TurniereManagementRow.tsx",
      "components/admin/planner/WeekplannerTournamentIdentityCard.tsx",
      "components/sporting-activity/detail/SportingActivityDetailContent.tsx",
    ];
    for (const relativePath of paths) {
      const src = readFileSync(join(repoRoot, relativePath), "utf8");
      expect(src, relativePath).toContain("SceTournamentCard");
    }
  });

  it("weekplanner preview uses canonical organiser fields — no tenantLogoUrl bypass", () => {
    const preview = readFileSync(
      join(repoRoot, "app/sce-preview/weekplanner-tournament/page.tsx"),
      "utf8",
    );
    const fixture = readFileSync(
      join(
        repoRoot,
        "lib/sporting-activity-presentation/canonical/__fixtures__/sce-weekplanner-tournament-preview-fixtures.ts",
      ),
      "utf8",
    );
    expect(preview).toContain("createSceWeekplannerTournamentTenantPreviewItem");
    expect(fixture).toContain("organizerLogoUrl");
    expect(fixture).toContain("SCE_CANONICAL_TENANT_ORGANISER_CREST_URL");
    expect(preview).not.toContain("tenantLogoUrl");
  });

  it("does not introduce new binary checkboxes in 01F tournament card sources", () => {
    const paths = [
      "components/sporting-activity/SceTournamentCard.tsx",
      "components/admin/tournamentcenter/TurniereManagementRow.tsx",
      "components/admin/planner/WeekplannerTournamentIdentityCard.tsx",
    ];
    for (const relativePath of paths) {
      const src = readFileSync(join(repoRoot, relativePath), "utf8");
      expect(src, relativePath).not.toMatch(/type=["']checkbox["']/);
    }
  });
});
