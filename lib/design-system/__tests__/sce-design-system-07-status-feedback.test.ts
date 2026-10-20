import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_07_CANONICAL_FEEDBACK_PRIMITIVES,
  SCE_DESIGN_SYSTEM_07_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_07_FEEDBACK_INVENTORY,
  SCE_DESIGN_SYSTEM_07_GOVERNANCE,
  SCE_DESIGN_SYSTEM_07_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_07_PO_CLOSURE,
  SCE_DESIGN_SYSTEM_07_PO_FLAGS,
  SCE_DESIGN_SYSTEM_07_PO_REVIEW,
  SCE_DESIGN_SYSTEM_07_REPRESENTATIVE_ADOPTION,
  SCE_DESIGN_SYSTEM_07_STATUS_FEEDBACK_AUDIT,
} from "@/lib/design-system/sce-design-system-07-meta";
import {
  SCE_ACTIONABLE_ERROR_CONTRACT,
  SCE_SEMANTIC_FEEDBACK_CONTRACT,
  SCE_SEMANTIC_FEEDBACK_TONES,
} from "@/lib/design-system/sce-feedback-status-foundation";
import { buildSceActionableErrorPresentation } from "@/lib/design-system/sce-actionable-error-foundation";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-07 status, feedback, loading, empty & error guardrails", () => {
  it("documents DS-07 roadmap, inventory, and master design system section", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-07.md");
    expect(roadmap).toContain(SCE_DESIGN_SYSTEM_07_PACKAGE_KEY);
    expect(roadmap).toContain("STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE");

    const inventory = readDoc("docs/design/SCE-DESIGN-SYSTEM-07-FEEDBACK-INVENTORY.md");
    expect(inventory).toContain("FEEDBACK_STATUS_MIGRATION_INVENTORY");

    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    for (const marker of SCE_DESIGN_SYSTEM_07_DOC_MARKERS.slice(0, 10)) {
      expect(master).toContain(marker);
    }
  });

  it("records PO closure acceptance on PR #885", () => {
    expect(SCE_DESIGN_SYSTEM_07_PO_CLOSURE.PO_DS07_VISUAL_UAT).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_07_PO_CLOSURE.PO_DS07_R1_VISUAL_UAT).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_07_PO_CLOSURE.PO_EMPTY_STATE_REVIEW).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_07_PO_CLOSURE.PO_PEOPLE_ACCESS_FEEDBACK_REVIEW).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_07_PO_CLOSURE.DS07_STATUS).toBe("CLOSED / ACCEPTED / MERGED");
    expect(SCE_DESIGN_SYSTEM_07_PO_REVIEW.DS07_STATUS).toBe("CLOSED / ACCEPTED / MERGED");
    expect(SCE_DESIGN_SYSTEM_07_PO_CLOSURE.ACCEPTED_R1_HEAD).toBe(
      "a19bff63838e1ad8a7384f29b2eb1665bb0d890d",
    );
  });

  it("locks feedback system governance and baseline STAGE", () => {
    expect(SCE_DESIGN_SYSTEM_07_PO_FLAGS.STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_07_PO_FLAGS.READINESS_SYSTEM_CANONICAL).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_07_PO_FLAGS.EMPTY_STATE_SYSTEM_CANONICAL).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_07_PO_FLAGS.LOADING_SYSTEM_CANONICAL).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_07_PO_REVIEW.BASELINE_STAGE_HEAD).toBe(
      "5439f64d914a53f1dc3d029957e8a021cf0a0269",
    );
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.PARALLEL_EMPTY_STATE_PRIMITIVE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.PARALLEL_READINESS_PRIMITIVE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.GENERIC_INTERNAL_ERROR_AS_DEFAULT).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.DS10_FINAL_ADOPTION_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_07_GOVERNANCE.LOADING_SYSTEM_PRODUCT_WIDE).toBe("YES");
  });

  it("defines semantic feedback tones without colour-only semantics", () => {
    expect(SCE_SEMANTIC_FEEDBACK_TONES).toEqual([
      "SUCCESS",
      "WARNING",
      "ERROR",
      "INFO",
      "NEUTRAL",
    ]);
    expect(SCE_SEMANTIC_FEEDBACK_CONTRACT.COLOUR_ONLY_SEMANTICS_ALLOWED).toBe("NO");
    expect(SCE_ACTIONABLE_ERROR_CONTRACT.ACTIONABLE_ERROR_UX_REQUIRED).toBe("YES");
  });

  it("requires canonical primitives in source — no parallel feedback families", () => {
    expect(readSrc("components/sce/feedback/SceReadinessStatusPanel.tsx")).toContain(
      "SceReadinessStatusPanel",
    );
    expect(readSrc("components/sce/feedback/SceEmptyState.tsx")).toContain("data-sce-empty-state");
    expect(readSrc("components/ui/page/EmptyState.tsx")).toContain("SceEmptyState");
    expect(SCE_DESIGN_SYSTEM_07_CANONICAL_FEEDBACK_PRIMITIVES.READINESS_PANEL).toBe(
      "SceReadinessStatusPanel",
    );
  });

  it("records product-wide feedback audit and migration inventory", () => {
    expect(SCE_DESIGN_SYSTEM_07_STATUS_FEEDBACK_AUDIT.length).toBeGreaterThanOrEqual(12);
    const areas = SCE_DESIGN_SYSTEM_07_STATUS_FEEDBACK_AUDIT.map((row) => row.area);
    expect(areas).toContain("Email Sender");
    expect(areas).toContain("Tournament Planner");
    expect(areas).toContain("Personen & Zugänge");
    expect(SCE_DESIGN_SYSTEM_07_FEEDBACK_INVENTORY.length).toBeGreaterThanOrEqual(8);
  });

  it("prefers actionable errors over generic Interner Fehler defaults", () => {
    const presentation = buildSceActionableErrorPresentation({
      context: "TOURNAMENT_PLANUNG_LOAD",
      serverMessage: "Interner Fehler.",
    });
    expect(presentation.title).toContain("Turnierplanung");
    expect(presentation.description).not.toBe("Interner Fehler.");
  });

  it("wires representative visible adoption on PO-reviewed surfaces", () => {
    expect(readSrc("components/admin/communication/email-sender/EmailSenderWorkspace.tsx")).toContain(
      "SceReadinessStatusPanel",
    );
    expect(readSrc("components/admin/tournamentcenter/planung/TournamentPlanungWorkspace.tsx")).toContain(
      "SceReadinessStatusPanel",
    );
    expect(readSrc("components/admin/users/TenantUsersSearchableList.tsx")).toContain("SceEmptyState");
    expect(readSrc("components/admin/planning-hub/PlanningHubFilteredEmptyState.tsx")).toContain(
      "SceEmptyState",
    );
    expect(readSrc("components/admin/tournamentcenter/planung/TournamentPlanungSetupDialog.tsx")).toContain(
      "SceActionableError",
    );
    expect(SCE_DESIGN_SYSTEM_07_REPRESENTATIVE_ADOPTION.VISIBLE_PRODUCT_ADOPTION_REQUIRED).toBe("YES");
  });
});
