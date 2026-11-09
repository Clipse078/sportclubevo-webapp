/**
 * SCE-DS2-04R2 — Full-width horizontal activity card lists
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_ACTIVITY_CARD_FORBIDDEN_DESKTOP_GRID_PATTERNS,
  SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER,
  SCE_ACTIVITY_CARD_LIST_CONTAINER_CLASS,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-full-width-list-contract";

function readRepo(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const ACTIVITY_LIST_SURFACES = [
  "components/admin/teams/upcoming-matches/TeamUpcomingMatchesView.tsx",
  "components/admin/teams/results/TeamResultsView.tsx",
  "components/admin/matchcenter/SpieleManagementUpcomingList.tsx",
  "components/admin/matchcenter/SpieleManagementWorkspace.tsx",
] as const;

describe("SCE-DS2-04R2 full-width horizontal activity cards", () => {
  it("defines list container contract without multi-column card grids", () => {
    expect(SCE_ACTIVITY_CARD_LIST_CONTAINER_CLASS).toContain("flex-col");
    expect(SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER).toBe("horizontal-full-width");
    expect(SCE_ACTIVITY_CARD_FORBIDDEN_DESKTOP_GRID_PATTERNS.length).toBeGreaterThan(0);
  });

  it.each(ACTIVITY_LIST_SURFACES)(
    "activity list surface %s avoids forbidden desktop fixture grids",
    (surfacePath) => {
      const source = readRepo(surfacePath);
      for (const forbidden of SCE_ACTIVITY_CARD_FORBIDDEN_DESKTOP_GRID_PATTERNS) {
        expect(source).not.toContain(forbidden);
      }
      expect(source).toContain("sceActivityCardList");
    },
  );

  it("match programme rows use list-row programme-fixture in matchcenter", () => {
    const matchRow = readRepo("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(matchRow).toContain('surface="list-row"');
    expect(matchRow).toContain('listRowPresentation="programme-fixture"');
    expect(matchRow).toContain("SceProgrammeActivityCardShell");
    const resultRow = readRepo("components/admin/matchcenter/SpieleManagementResultRow.tsx");
    expect(resultRow).toContain('listRowPresentation="programme-fixture"');
  });

  it("team cockpit rows use canonical programme shell + reference split", () => {
    const upcoming = readRepo("components/admin/teams/upcoming-matches/TeamUpcomingMatchRow.tsx");
    expect(upcoming).toContain("SceProgrammeActivityCardShell");
    expect(upcoming).toContain('listRowPresentation="programme-fixture"');
    const results = readRepo("components/admin/teams/results/TeamResultRow.tsx");
    expect(results).toContain('listRowPresentation="programme-fixture"');
  });

  it("non-match programme cards use horizontal reference-row contract", () => {
    const training = readRepo("components/sporting-activity/SceTrainingCard.tsx");
    expect(training).toContain('data-sce-programme-card-contract="reference-row"');
    const tournament = readRepo("components/sporting-activity/SceTournamentCard.tsx");
    expect(tournament).toContain('data-sce-programme-card-contract="reference-row"');
    const clubEvent = readRepo("components/sporting-activity/SceClubEventCard.tsx");
    expect(clubEvent).toContain('data-sce-programme-card-contract="reference-row"');
  });

  it("reference layout allows team-name wrapping (no narrow fixture columns)", () => {
    const layout = readRepo(
      "lib/sporting-activity-presentation/canonical/activity-card-reference-layout.ts",
    );
    expect(layout).not.toContain("max-w-[15rem]");
    expect(layout).toContain("flex-1");
    const fixture = readRepo("components/sporting-activity/SceMatchFixtureReferenceLayout.tsx");
    expect(fixture).toContain("truncate={false}");
  });
});
