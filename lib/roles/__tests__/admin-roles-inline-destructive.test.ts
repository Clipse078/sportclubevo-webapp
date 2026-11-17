import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("tenant role admin surfaces — no modal delete", () => {
  it("RoleDeleteButton uses inline confirm shell only", () => {
    const button = read("components/admin/roles/RoleDeleteButton.tsx");
    const confirm = read("components/admin/roles/RoleDeleteInlineConfirm.tsx");
    expect(button).not.toMatch(/from ["']@\/components\/ui\/Dialog["']/);
    expect(button).toContain("RoleDeleteInlineConfirm");
    expect(confirm).toContain("SceInlineDestructiveConfirm");
    expect(confirm).not.toContain("Dialog");
  });

  it("TenantRoleDetailsForm keeps inline archive confirm", () => {
    const form = read("components/admin/roles/TenantRoleDetailsForm.tsx");
    expect(form).not.toContain("Dialog");
    expect(form).toContain("confirmArchive");
  });
});