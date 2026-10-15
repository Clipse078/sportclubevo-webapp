import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("restore-protected-credential-from-source-database", () => {
  it("never logs password material and requires explicit authorization", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/restore-protected-credential-from-source-database.ts"),
      "utf8",
    );
    expect(source).toContain("RESTORE_FROM_SOURCE_DATABASE");
    expect(source).toContain("restore-protected-credential:stage");
    expect(source).not.toMatch(/console\.log\([^)]*passwordHash/i);
    expect(source).not.toContain("console.log(sourceUser.passwordHash");
  });
});
