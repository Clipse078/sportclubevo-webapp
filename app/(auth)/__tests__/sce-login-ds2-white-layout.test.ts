import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE login DS2 white-first auth shell", () => {
  it("scopes white edition tokens to auth layout only", () => {
    const layout = read("app/(auth)/layout.tsx");
    expect(layout).toContain('data-sce-theme');
    expect(layout).toContain("sce-theme-white");
    expect(layout).not.toContain("isSceWhiteEditionEnabled");
  });

  it("uses white-background wordmark on login", () => {
    const login = read("components/auth/LoginForm.tsx");
    expect(login).toContain("sportclubevo_logo.png");
    expect(login).not.toContain("sportclubevo_logo_alt.png");
  });
});
