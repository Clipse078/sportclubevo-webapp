import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE,
  SCE_DESIGN_SYSTEM_06_R2_SURFACE_DEBT_SNAPSHOT,
  SCE_DESIGN_SYSTEM_06_R2_UNCONTAINED_SURFACE_AUDIT_CATEGORY,
} from "@/lib/design-system/sce-design-system-06-r2-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-06 R2 guardrails", () => {
  it("locks functional surface hierarchy governance flags", () => {
    expect(SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE.FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE.RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE.CARD_SOUP_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE.TOURNAMENT_PLANUNG_RESOURCE_SURFACE_CONVERGENCE).toBe(
      "YES",
    );
  });

  it("locks smart field preparation governance flags", () => {
    expect(SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE.RECOMMENDED_FIELD_COUNT_AUTO_PREPARED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE.FIELD_PREPARATION_IDEMPOTENT).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE.SILENT_FACILITY_ASSIGNMENT).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE.PARALLEL_SCHEDULE_TRUTH_INTRODUCED).toBe("NO");
  });

  it("uses canonical planning editor section for tournament planung resources (no parallel surface primitive)", () => {
    const record = readSrc("components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx");
    expect(record).toContain("PlanningEditorSection");
    expect(record).toContain("turniere-record-section-resources");
    expect(record).not.toContain('TurniereRecordSection title="Ressourcen"');
    const readiness = readSrc("components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx");
    expect(readiness).toContain("SceReadinessStatusPanel");
    expect(readiness).not.toContain("SCE_SURFACE_STANDARD_PANEL");
  });

  it("records DS-10 uncontained surface audit category for representative areas", () => {
    expect(SCE_DESIGN_SYSTEM_06_R2_UNCONTAINED_SURFACE_AUDIT_CATEGORY).toBe(
      "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    );
    expect(SCE_DESIGN_SYSTEM_06_R2_SURFACE_DEBT_SNAPSHOT.length).toBeGreaterThanOrEqual(10);
    const tournamentRow = SCE_DESIGN_SYSTEM_06_R2_SURFACE_DEBT_SNAPSHOT.find((r) =>
      r.area.includes("Tournament"),
    );
    expect(tournamentRow?.classification).toBe("CONTAINED");
  });

  it("wires recommended pitch preparation into existing HOME planner setup hydrate", () => {
    expect(readSrc("lib/tournaments/planung/hydrate-tournament-planner-setup.server.ts")).toContain(
      "applyRecommendedPlannerPitchDraftPreparation",
    );
    expect(readSrc("components/admin/tournamentcenter/planung/TournamentPlanungSetupDialog.tsx")).toContain(
      "applyRecommendedPlannerPitchDraftPreparation",
    );
  });
});
