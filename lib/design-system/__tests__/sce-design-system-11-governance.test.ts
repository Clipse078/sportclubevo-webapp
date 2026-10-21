import { describe, expect, it } from "vitest";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import {
  SCE_DESIGN_SYSTEM_CANONICAL_MASTER,
  SCE_DESIGN_SYSTEM_GOVERNANCE_LOCKS,
  SCE_DESIGN_SYSTEM_GOVERNANCE_RULES,
} from "@/lib/design-system/sce-design-system-governance";
import {
  assertSceDesignSystemExceptionRegistryValid,
  SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY,
} from "@/lib/design-system/sce-design-system-exception-registry";
import {
  formatSceGovernanceViolationsForCli,
  runSceDesignSystemGovernance,
} from "@/lib/design-system/sce-design-system-governance-runner";
import { SCE_DESIGN_SYSTEM_11_READINESS } from "@/lib/design-system/sce-design-system-11-meta";
import {
  SCE_CONTEXTUAL_PREVIEW_LAYER_CLASS,
  SCE_Z_INDEX_CONTEXTUAL_PREVIEW,
} from "@/lib/ui/sce-overlay-layering";

describe("SCE-DESIGN-SYSTEM-11 governance architecture", () => {
  it("locks DS-11 governance programme flags", () => {
    expect(SCE_DESIGN_SYSTEM_GOVERNANCE_LOCKS.SCE_DESIGN_SYSTEM_GOVERNANCE_ENABLED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_GOVERNANCE_LOCKS.DESIGN_SYSTEM_MACHINE_READABLE_GOVERNANCE).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_11_READINESS.SCE_DESIGN_SYSTEM_11_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_11_READINESS.SCE_DESIGN_SYSTEM_V1_READY_FOR_FINAL_CLOSURE).toBe("NO");
  });

  it("points canonical master documentation at SCE-DESIGN-SYSTEM.md", () => {
    expect(SCE_DESIGN_SYSTEM_CANONICAL_MASTER).toBe("docs/design/SCE-DESIGN-SYSTEM.md");
  });

  it("validates typed exception registry entries", () => {
    expect(() => assertSceDesignSystemExceptionRegistryValid()).not.toThrow();
    expect(SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY.every((e) => e.reason.trim().length > 0)).toBe(
      true,
    );
  });

  it("exposes stable governance rule ids with actionable summaries", () => {
    expect(Object.keys(SCE_DESIGN_SYSTEM_GOVERNANCE_RULES).length).toBeGreaterThanOrEqual(8);
    expect(SCE_DESIGN_SYSTEM_GOVERNANCE_RULES["SCE-DS-GOV-CONTROL-001"].suggestion).toContain(
      "SwitchToggle",
    );
  });
});

describe("SCE-DESIGN-SYSTEM-11 governance runner behaviour", () => {
  it("PASS — canonical binary toggle primitive", () => {
    expect(SwitchThumb).toBeDefined();
  });

  it("FAIL — binary checkbox outside baseline allowlist (fixture)", () => {
    const result = runSceDesignSystemGovernance({
      files: ["components/admin/__governance-fixtures__/BinaryCheckboxViolationFixture.tsx"],
    });
    expect(result.pass).toBe(false);
    expect(result.violations.some((v) => v.ruleId === "SCE-DS-GOV-CONTROL-001")).toBe(true);
    expect(formatSceGovernanceViolationsForCli(result.violations)).toContain(
      "SCE-DS-GOV-CONTROL-001",
    );
  });

  it("PASS — multi-selection checkbox inside baseline allowlist semantics", () => {
    const result = runSceDesignSystemGovernance({
      files: ["components/admin/roles/RolePermissionEditor.tsx"],
    });
    expect(result.violations.filter((v) => v.ruleId === "SCE-DS-GOV-CONTROL-001")).toHaveLength(0);
  });

  it("FAIL — create trigger missing modal-first marker (fixture)", () => {
    const result = runSceDesignSystemGovernance({
      files: ["components/admin/__governance-fixtures__/CreateTriggerViolationFixture.tsx"],
    });
    expect(result.violations.some((v) => v.ruleId === "SCE-DS-GOV-CREATE-001")).toBe(true);
  });

  it("PASS — semantic light preview exception for tournament documents", () => {
    const result = runSceDesignSystemGovernance({
      files: ["components/sce/tournament/SceTournamentSpielplanDocument.tsx"],
    });
    expect(result.violations.filter((v) => v.ruleId === "SCE-DS-GOV-SURFACE-001")).toHaveLength(0);
  });

  it("FAIL — unclassified light functional surface in canonical workspace (fixture)", () => {
    const result = runSceDesignSystemGovernance({
      files: ["components/sce/workspace/__governance-fixtures__/LightSurfaceViolationFixture.tsx"],
    });
    expect(result.violations.some((v) => v.ruleId === "SCE-DS-GOV-SURFACE-001")).toBe(true);
  });

  it("PASS — Organisation Builder contextual preview uses canonical layer class", () => {
    const result = runSceDesignSystemGovernance({
      files: ["components/admin/org/OrgUnitContextualPreviewLayer.tsx"],
    });
    expect(result.violations.filter((v) => v.ruleId === "SCE-DS-GOV-LAYER-001")).toHaveLength(0);
  });

  it("FAIL — rogue magic z-index in canonical SCE component (fixture)", () => {
    const result = runSceDesignSystemGovernance({
      files: ["components/sce/__governance-fixtures__/MagicZIndexViolationFixture.tsx"],
    });
    expect(result.violations.some((v) => v.ruleId === "SCE-DS-GOV-LAYER-001")).toBe(true);
  });

  it("PASS — full repository governance scan (clean DS-10 baseline)", () => {
    const result = runSceDesignSystemGovernance();
    expect(result.pass).toBe(true);
    expect(result.filesScanned).toBeGreaterThan(100);
    expect(result.ruleCount).toBe(Object.keys(SCE_DESIGN_SYSTEM_GOVERNANCE_RULES).length);
  });

  it("records canonical contextual preview z-index scale", () => {
    expect(SCE_Z_INDEX_CONTEXTUAL_PREVIEW).toBe(80);
    expect(SCE_CONTEXTUAL_PREVIEW_LAYER_CLASS).toBe("sce-contextual-preview-layer");
  });
});

describe("SCE-DESIGN-SYSTEM-11 exception registry behaviour", () => {
  it("accepts classified semantic content exception paths", () => {
    const covered = SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY.some(
      (e) => e.id === "SCE-DS-EX-SEM-001" && e.category === "SEMANTIC_CONTENT_EXCEPTION",
    );
    expect(covered).toBe(true);
  });

  it("FAIL — unclassified exception entries are forbidden at validation time", () => {
    expect(() =>
      assertSceDesignSystemExceptionRegistryValid([
        {
          id: "BAD",
          category: "SEMANTIC_CONTENT_EXCEPTION",
          scope: "components/example.tsx",
          reason: "   ",
        },
      ]),
    ).toThrow(/reason/i);
  });
});
