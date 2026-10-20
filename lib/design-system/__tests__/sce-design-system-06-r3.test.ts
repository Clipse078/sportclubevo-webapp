import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_06_R3_CANONICAL_PRINCIPLE,
  SCE_DESIGN_SYSTEM_06_R3_GOVERNANCE,
  SCE_DESIGN_SYSTEM_06_R3_PO_REVIEW,
} from "@/lib/design-system/sce-design-system-06-r3-meta";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-DESIGN-SYSTEM-06-R3 governance", () => {
  it("locks schedule vs playing-format invariants", () => {
    expect(SCE_DESIGN_SYSTEM_06_R3_GOVERNANCE.PLAYING_FORMAT_RECOMMENDED_FROM_PARTICIPANT_COUNT).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_06_R3_GOVERNANCE.PLAYING_FORMAT_AUTO_ASSIGNED_TO_RECOMMENDED_PITCH).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_06_R3_GOVERNANCE.PITCH_COUNT_RECOMMENDATION_INDEPENDENT_OF_PLAYING_FORMAT).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_06_R3_GOVERNANCE.SILENT_FORMAT_INFERENCE).toBe("NO");
  });

  it("documents canonical principle in roadmap and proposal resolver", () => {
    const ds06 = read("docs/roadmap/SCE-DESIGN-SYSTEM-06.md");
    expect(ds06).toMatch(/ORGANISER CHOOSES THE PLAYING FORMAT|SCE empfiehlt/i);
    const proposal = read("lib/tournaments/composer/tournament-composer-programme-proposal.ts");
    expect(proposal).toMatch(/fieldProposalPitchCount/);
    expect(proposal).not.toMatch(/fieldProposalPlayersPerSide/);
  });

  it("composer UI does not recommend players-per-side in Empfohlene Aufteilung", () => {
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).toMatch(/scheduleRecommendationSummary/);
    expect(panels).not.toMatch(/allocationSummaryLines/);
    expect(panels).not.toMatch(/gegen \$\{/);
  });

  it("PO review metadata targets PR 884 on DS-06 branch", () => {
    expect(SCE_DESIGN_SYSTEM_06_R3_PO_REVIEW.PR).toBe("884");
    expect(SCE_DESIGN_SYSTEM_06_R3_PO_REVIEW.BRANCH).toBe(
      "cursor/sce-design-system-06-actions-dialogs-composer",
    );
    expect(SCE_DESIGN_SYSTEM_06_R3_CANONICAL_PRINCIPLE).toMatch(/ORGANISER CHOOSES THE PLAYING FORMAT/);
  });
});
