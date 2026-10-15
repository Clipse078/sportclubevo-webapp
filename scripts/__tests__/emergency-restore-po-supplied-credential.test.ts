import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("emergency-restore-po-supplied-credential", () => {
  it("requires stage authorization and never prints password material", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/emergency-restore-po-supplied-credential.ts"),
      "utf8",
    );
    expect(source).toContain("emergency-restore-po-supplied-credential:stage");
    expect(source).toContain("STAGE_CANONICAL_DATABASE_FINGERPRINT");
    expect(source).toContain("verifyPassword");
    expect(source).toContain("authorizeCredentialsUser");
    expect(source).not.toMatch(/console\.log\([^)]*passwordHash/i);
  });
});
