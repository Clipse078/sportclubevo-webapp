import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SCE-PERF-02R1 request-scoped auth session", () => {
  it("wraps auth() with React cache()", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/auth/get-request-auth-session.ts"),
      "utf8",
    );
    expect(source).toContain('import { cache } from "react"');
    expect(source).toContain("getRequestAuthSession");
    expect(source).toContain("auth()");
  });

  it("permission gates use getRequestAuthSession instead of direct auth()", () => {
    for (const file of ["require-any-permission.ts", "require-permission.ts"]) {
      const source = readFileSync(join(process.cwd(), "lib/permissions", file), "utf8");
      expect(source).toContain("getRequestAuthSession");
      expect(source).not.toMatch(/from "@\/auth"/);
    }
  });
});
