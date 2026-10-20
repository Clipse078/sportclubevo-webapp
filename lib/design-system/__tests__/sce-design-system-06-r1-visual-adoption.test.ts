import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_06_R1_GOVERNANCE,
  SCE_DESIGN_SYSTEM_06_R1_PLANNER_ENTRY,
  SCE_DESIGN_SYSTEM_06_R1_PO_REVIEW,
  SCE_DESIGN_SYSTEM_06_R1_VISIBLE_ADOPTION,
} from "@/lib/design-system/sce-design-system-06-r1-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-06 R1 visible adoption guardrails", () => {
  it("locks visible product adoption governance flags", () => {
    expect(SCE_DESIGN_SYSTEM_06_R1_VISIBLE_ADOPTION.VISIBLE_PRODUCT_ADOPTION_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_R1_VISIBLE_ADOPTION.VISIBLE_DESIGN_CONVERGENCE_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_R1_VISIBLE_ADOPTION.COMMUNICATION_VISUAL_LANGUAGE_PRESERVED).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_06_R1_VISIBLE_ADOPTION.LOCAL_MICRO_PATTERN_DRIFT_ALLOWED).toBe("NO");
  });

  it("locks existing tournament planner entry markers without parallel schedule truth", () => {
    expect(SCE_DESIGN_SYSTEM_06_R1_PLANNER_ENTRY.EXISTING_HOME_TOURNAMENT_PLANNER_ENTRY).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_R1_PLANNER_ENTRY.AWAY_TOURNAMENT_PLANNER_PROTECTION).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_R1_PLANNER_ENTRY.PARALLEL_SCHEDULE_TRUTH_INTRODUCED).toBe("NO");
  });

  it("wires representative adoption on PO-reviewed surfaces", () => {
    expect(readSrc("components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx")).toContain(
      "tournament-planung-setup-open",
    );
    expect(readSrc("components/admin/tournamentcenter/TurniereManagementHeaderMenu.tsx")).toContain(
      "SceOverflowMenu",
    );
    expect(readSrc("components/admin/users/TenantUsersSearchableList.tsx")).toContain(
      "people-access-add-person",
    );
    expect(readSrc("app/(admin)/dashboard/communication/page.tsx")).toContain("SceActionLink");
  });

  it("records FEATURE_HEAD_FULL as a real SHA after R1 commits", () => {
    expect(SCE_DESIGN_SYSTEM_06_R1_PO_REVIEW.FEATURE_HEAD_FULL).toMatch(/^[0-9a-f]{40}$|PENDING_COMMIT/);
    expect(SCE_DESIGN_SYSTEM_06_R1_GOVERNANCE.SCE_DESIGN_SYSTEM_COMPLIANCE).toBe("PASS");
  });
});
