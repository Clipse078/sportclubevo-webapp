import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("deployment seed credential safety", () => {
  it("prisma/seed.ts does not write User.passwordHash on upsert update paths", () => {
    const seed = readFileSync(resolve(process.cwd(), "prisma/seed.ts"), "utf8");
    expect(seed).not.toMatch(/passwordHash:\s*await/);
    expect(seed).not.toContain("passwordHash:");
  });

  it("bootstrap-admin upsert update block excludes passwordHash", () => {
    const bootstrap = readFileSync(
      resolve(process.cwd(), "prisma/bootstrap-admin.ts"),
      "utf8",
    );
    expect(bootstrap).toContain("passwordHash is intentionally absent from the `update` block");
  });

  it("rperm-03b bootstrap applies protected guard before club admin password update", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/rperm-03b-bootstrap-admin-separation.ts"),
      "utf8",
    );
    expect(script).toContain("assertProtectedAuthAllowed(clubAdminEmail");
    expect(script).toContain("resetClubAdminPassword");
  });
});
