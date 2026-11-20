import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { shouldApplyDatabaseMigrations } from "@/lib/server/database-migration-policy";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-05 single Vorhaben linking surface", () => {
  it("edit page uses TargetInitiativeLinksSection and meetings-only TargetLinkEditor", () => {
    const edit = read("app/(admin)/vereinsleitung/targets/[id]/edit/page.tsx");
    expect(edit).toContain("TargetInitiativeLinksSection");
    expect(edit).toContain("TargetLinkEditor");
    expect(edit).not.toContain("getInitiativeLinkOptions");
    expect(edit).not.toContain("availableInitiatives");
  });

  it("TargetLinkEditor does not expose initiative chip editing", () => {
    const editor = read("components/admin/targets/TargetLinkEditor.tsx");
    expect(editor).toContain('data-testid="target-meeting-links-editor"');
    expect(editor).toContain("initialInitiativeRefs");
    expect(editor).toContain("initiativeRefs: initialInitiativeRefs");
    expect(editor).not.toContain("toggleInitiative");
    expect(editor).not.toContain("availableInitiatives");
    expect(editor).not.toMatch(/>\s*Initiativen\s*</);
    expect(editor).toContain("CD_TARGET_COPY.vorhabenManagedInSectionAbove");
  });

  it("TargetInitiativeLinksSection is the Vorhaben editor with legacy visibility and unlink notice", () => {
    const section = read("components/admin/targets/TargetInitiativeLinksSection.tsx");
    expect(section).toContain('data-testid="target-initiative-links-section"');
    expect(section).toContain("legacy: true");
    expect(section).toContain("CD_TARGET_COPY.legacyInitiativeBadge");
    expect(section).toContain("unlinkInitiative");
    expect(section).toContain("CD_TARGET_COPY.legacyLinkRemainsAfterUnlink");
    expect(section).toContain('data-testid="target-initiative-legacy-unlink-notice"');
  });

  it("detail page omits Vorhaben panel while edit keeps initiative linking", () => {
    const detail = read("app/(admin)/vereinsleitung/targets/[id]/page.tsx");
    expect(detail).not.toContain("TargetInitiativeLinksSection");
    expect(detail).not.toContain("TargetLinkEditor");
    expect(detail).toContain("TargetTasksSection");
    expect(detail).toContain("target-linked-strategie");
  });
});

describe("PKG-05 migration disable flag (deployment scripts)", () => {
  it("uses APPLY_DATABASE_MIGRATIONS only — not SKIP_DB_MIGRATIONS", () => {
    const deployScript = read("scripts/deploy-migrations-if-enabled.ts");
    const policy = read("lib/server/database-migration-policy.ts");
    const pkg05Verify = read("scripts/sce-cd-05-pkg-05-stage-migration-verify-readonly.ts");

    expect(policy).toContain("APPLY_DATABASE_MIGRATIONS");
    expect(deployScript).toContain("deploy-migrations-if-enabled");
    expect(pkg05Verify).toContain("APPLY_DATABASE_MIGRATIONS=true");
    expect(deployScript).not.toContain("SKIP_DB_MIGRATIONS");
    expect(policy).not.toContain("SKIP_DB_MIGRATIONS");
    expect(pkg05Verify).not.toContain("SKIP_DB_MIGRATIONS");
  });

  it("build skips migrations by default via shouldApplyDatabaseMigrations", () => {
    expect(shouldApplyDatabaseMigrations({})).toBe(false);
    expect(shouldApplyDatabaseMigrations({ APPLY_DATABASE_MIGRATIONS: "false" })).toBe(false);
    expect(shouldApplyDatabaseMigrations({ APPLY_DATABASE_MIGRATIONS: "true" })).toBe(true);
  });
});