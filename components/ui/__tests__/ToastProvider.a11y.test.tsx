import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ToastProvider accessibility", () => {
  it("labels the toast stack with an allowed landmark role", () => {
    const source = readFileSync(join(process.cwd(), "components/ui/ToastProvider.tsx"), "utf8");
    expect(source).toMatch(/role="region"/);
    expect(source).toContain('aria-label="Benachrichtigungen"');
  });
});
