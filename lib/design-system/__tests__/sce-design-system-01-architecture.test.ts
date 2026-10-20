import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_01_COMMUNICATION_REFERENCE_ROUTES,
  SCE_DESIGN_SYSTEM_01_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_01_PO_VISUAL_DIRECTION,
  SCE_DESIGN_SYSTEM_01_PO_VISUAL_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_01_REGISTRY_COUNTS,
  SCE_DESIGN_SYSTEM_COMPLIANCE_FIELDS,
  SCE_DESIGN_SYSTEM_PROPOSED_SEQUENCE,
} from "@/lib/design-system/sce-design-system-01-meta";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-01 architecture guardrails", () => {
  it("requires canonical master document and DS-01 roadmap", () => {
    expect(readDoc("docs/design/SCE-DESIGN-SYSTEM.md")).toContain(
      "SCE-DESIGN-SYSTEM-01",
    );
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-01.md");
    expect(roadmap).toContain(SCE_DESIGN_SYSTEM_01_PACKAGE_KEY);
    expect(roadmap).toContain("AUDIT FIRST");
  });

  it("requires primitive registry and migration matrix with structure", () => {
    const registry = readDoc(
      "docs/design/SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md",
    );
    expect(registry).toContain("CANONICAL");
    expect(registry).toContain("LEGACY_MIGRATE");
    expect(registry).toContain("CANONICAL_PRIMITIVES_COUNT");

    const matrix = readDoc(
      "docs/design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md",
    );
    expect(matrix).toContain("MIGRATION_PRIORITY");
    expect(matrix).toContain("| P0 |");
  });

  it("documents compliance vocabulary and Toggle First in master doc", () => {
    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    for (const field of SCE_DESIGN_SYSTEM_COMPLIANCE_FIELDS) {
      expect(master).toContain(field);
    }
    expect(master).toContain("Toggle First");
    expect(master).toContain("WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE");
  });

  it("prohibits World Activity Card as architecture term in new DS-01 docs", () => {
    const ds01Docs = [
      "docs/roadmap/SCE-DESIGN-SYSTEM-01.md",
      "docs/design/SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md",
      "docs/design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md",
    ];
    for (const path of ds01Docs) {
      const text = readDoc(path);
      expect(text).not.toMatch(/World Activity Card/i);
    }
    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(master).toContain("Do **not** introduce");
    expect(master).toContain("World Activity Card");
  });

  it("exposes registry counts and proposed package sequence", () => {
    expect(SCE_DESIGN_SYSTEM_01_REGISTRY_COUNTS.CANONICAL_PRIMITIVES_COUNT).toBe(
      38,
    );
    expect(SCE_DESIGN_SYSTEM_PROPOSED_SEQUENCE[0]).toBe(
      "SCE-DESIGN-SYSTEM-01",
    );
    expect(SCE_DESIGN_SYSTEM_PROPOSED_SEQUENCE.at(-1)).toBe(
      "SCE-DESIGN-SYSTEM-11",
    );
    expect(SCE_DESIGN_SYSTEM_PROPOSED_SEQUENCE).toHaveLength(11);
  });

  it("roadmap documents binary control audit fields", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-01.md");
    expect(roadmap).toContain("BINARY_CONTROL_AUDIT");
    expect(roadmap).toContain("LEGACY_BINARY_CHECKBOX_COUNT");
    expect(roadmap).toContain("CANONICAL_TOGGLE_IMPLEMENTATIONS");
  });

  it("locks PO visual direction markers in master and roadmap (DS-01-R1)", () => {
    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-01.md");
    for (const marker of SCE_DESIGN_SYSTEM_01_PO_VISUAL_DOC_MARKERS) {
      expect(master).toContain(marker);
      expect(roadmap).toContain(marker);
    }
    expect(
      SCE_DESIGN_SYSTEM_01_PO_VISUAL_DIRECTION
        .COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE,
    ).toBe("YES");
    expect(
      SCE_DESIGN_SYSTEM_01_PO_VISUAL_DIRECTION.PRODUCT_WIDE_ROLLOUT_TARGET,
    ).toBe("YES");
  });

  it("records Communication as primary visual reference route evidence", () => {
    const registry = readDoc(
      "docs/design/SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md",
    );
    for (const route of SCE_DESIGN_SYSTEM_01_COMMUNICATION_REFERENCE_ROUTES) {
      expect(registry).toContain(route);
    }
    const matrix = readDoc(
      "docs/design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md",
    );
    expect(matrix).toContain("VISUAL_DIRECTION_CLASSIFICATION");
  });

  it("preserves domain-specific layout and activity-card architecture flags", () => {
    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(master).toContain("DOMAIN_SPECIFIC_LAYOUTS_PRESERVED = YES");
    expect(master).toContain("ACTIVITY_CARD_FAMILY_PRESERVED = YES");
    expect(master).toContain("Do **not** introduce");
    expect(master).toContain("World Activity Card");
  });
});
