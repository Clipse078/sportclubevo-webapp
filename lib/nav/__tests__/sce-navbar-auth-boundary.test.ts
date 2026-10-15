/**
 * SCE-NAVBAR-UPGRADE-01 — navigation must remain auth read-only.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { describe, expect, it } from "vitest";

const NAV_ROOT = resolve(process.cwd(), "components/sce/navigation");
const FORBIDDEN_IMPORTS = [
  "@/lib/auth/password",
  "hashPassword",
  "verifyPassword",
  "protected-credential-mutation",
  "password-reset",
  "resetPlatformAccountPassword",
  "assertProtectedAuthAllowed",
];

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      files.push(...listSourceFiles(full));
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("SCE navbar auth boundary", () => {
  it("navigation modules do not import credential mutation helpers", () => {
    const files = listSourceFiles(NAV_ROOT);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const forbidden of FORBIDDEN_IMPORTS) {
        expect(source).not.toContain(forbidden);
      }
    }
  });
});
