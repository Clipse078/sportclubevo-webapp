import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SCE_UX_01_DECISION_MATRIX,
  SCE_UX_01_DESIGN_PRINCIPLE,
  SCE_UX_01_DOMAIN_AUDIT,
  SCE_UX_01_IMPLEMENTATION_PACKAGES,
  SCE_UX_01_RECOMMENDED_FIRST_PACKAGE_ID,
  SCE_UX_01_REUSABLE_PRIMITIVES,
} from "../sce-ux-01-interaction-architecture";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("SCE-UX-01 — interaction workflow audit contract", () => {
  it("documents the design principle", () => {
    expect(SCE_UX_01_DESIGN_PRINCIPLE).toContain("Simple understanding");
  });

  it("defines five interaction patterns in the decision matrix", () => {
    const patterns = new Set(SCE_UX_01_DECISION_MATRIX.map((r) => r.pattern));
    expect(patterns.size).toBe(5);
    expect(patterns).toEqual(
      new Set([
        "INLINE_EDIT",
        "MODAL_DECISION",
        "DRAWER_CONTEXT",
        "FULL_PAGE_WORKFLOW",
        "GUIDED_STEPS",
      ]),
    );
  });

  it("audits six product domains including Club Development", () => {
    expect(SCE_UX_01_DOMAIN_AUDIT.length).toBe(6);
    const clubDev = SCE_UX_01_DOMAIN_AUDIT.find((d) => d.domain.includes("Club Development"));
    expect(clubDev?.clubDevelopment20Relevance).toBe("HIGH");
  });

  it("recommends SCE-UX-01A as first implementation package", () => {
    const first = SCE_UX_01_IMPLEMENTATION_PACKAGES.find(
      (p) => p.id === SCE_UX_01_RECOMMENDED_FIRST_PACKAGE_ID,
    );
    expect(first?.priority).toBe(1);
    expect(first?.title).toMatch(/Club Development/i);
  });

  it("links reusable primitives to files that exist on STAGE", () => {
    for (const relative of SCE_UX_01_REUSABLE_PRIMITIVES) {
      expect(() => readRepo(relative)).not.toThrow();
    }
  });

  it("has a human-readable audit doc that references the typed contract", () => {
    const doc = readRepo("docs/ux/SCE-UX-01-interaction-workflow-audit.md");
    expect(doc).toContain("SCE-UX-01");
    expect(doc).toContain("sce-ux-01-interaction-architecture.ts");
    expect(doc).toContain("SCE-UX-01A");
  });

  it("evidence: Club Development composers use shared workspace shell", () => {
    expect(readRepo("components/admin/targets/CreateTargetComposerDialog.tsx")).toContain(
      "SceClubDevelopmentComposerShell",
    );
    expect(readRepo("components/sce/club-development/SceClubDevelopmentComposerShell.tsx")).toContain(
      'size="workspace"',
    );
  });
});
