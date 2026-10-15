import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { assertProtectedCredentialMutationAllowed } from "@/lib/auth/protected-credential-mutation";
import { verifyPassword } from "@/lib/auth/password";

const PROTECTED_EMAIL = "it@fcallschwil.ch";

describe("SCE-HOTFIX-LOGIN-02 credential safety regression", () => {
  it("seed rerun does not reference passwordHash writes", () => {
    const seed = readFileSync(resolve(process.cwd(), "prisma/seed.ts"), "utf8");
    expect(seed).not.toContain("passwordHash:");
  });

  it("bootstrap-admin update block excludes passwordHash", () => {
    const bootstrap = readFileSync(
      resolve(process.cwd(), "prisma/bootstrap-admin.ts"),
      "utf8",
    );
    expect(bootstrap).toContain("passwordHash is intentionally absent from the `update` block");
  });

  it("blocks unauthorised protected credential mutation", () => {
    expect(() =>
      assertProtectedCredentialMutationAllowed(PROTECTED_EMAIL, {
        isCreate: false,
        context: "automated",
      }),
    ).toThrow(/protected identity/i);
  });

  it("allows explicit emergency recovery intent", () => {
    expect(() =>
      assertProtectedCredentialMutationAllowed(PROTECTED_EMAIL, {
        isCreate: false,
        context: "automated",
        intent: "EMERGENCY_RECOVERY",
      }),
    ).not.toThrow();
  });

  it("verifyPassword matches canonical bcrypt contract", async () => {
    const hash = bcrypt.hashSync("fixture-password-12chars", 12);
    expect(await verifyPassword("fixture-password-12chars", hash)).toBe(true);
    expect(await verifyPassword("wrong-password-12", hash)).toBe(false);
  });

  it("acceptance fixture sync refuses protected persistent identities", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/acceptance/fixture-password-sync.ts"),
      "utf8",
    );
    expect(source).toContain("getProtectedAuthIdentities");
    expect(source).toContain("Refusing fixture password sync for protected persistent identity");
  });

  it("navbar package has no passwordHash mutation identifiers", () => {
    const navFiles = [
      "lib/nav/app-navigation-model.ts",
      "components/nav/NavDestinationSceIcon.tsx",
    ];
    for (const rel of navFiles) {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(src).not.toMatch(/passwordHash\s*:/);
      expect(src).not.toContain("hashPassword(");
    }
  });

  it("emergency restore script never logs secrets", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/emergency-restore-po-supplied-credential.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/console\.log\([^)]*passwordHash/i);
    expect(source).toContain("EMERGENCY_RECOVERY");
  });
});
