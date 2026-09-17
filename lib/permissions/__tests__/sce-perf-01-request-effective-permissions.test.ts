import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SCE-PERF-01 request-scoped RBAC cache", () => {
  it("uses React cache for live EffectivePermissionResolver reads", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/permissions/request-effective-permissions.ts"),
      "utf8",
    );
    expect(source).toContain('import { cache } from "react"');
    expect(source).toContain("getRequestEffectivePermissions");
    expect(source).toContain("getEffectivePermissions");
  });

  it("permission gates delegate to getRequestEffectivePermissions", () => {
    const requireAny = readFileSync(
      join(process.cwd(), "lib/permissions/require-any-permission.ts"),
      "utf8",
    );
    const requireOne = readFileSync(
      join(process.cwd(), "lib/permissions/require-permission.ts"),
      "utf8",
    );
    expect(requireAny).toContain("getRequestEffectivePermissions");
    expect(requireOne).toContain("getRequestEffectivePermissions");
    expect(requireAny).not.toContain("createEffectivePermissionResolver(prisma)");
    expect(requireOne).not.toContain("createEffectivePermissionResolver(prisma)");
  });
});
