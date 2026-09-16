import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("club detail provider metadata presentation", () => {
  it("does not use Hash icons for Anbieter profile fields", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/vereine/[clubId]/page.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Hash");
    expect(source).toContain('label="Anbieter"');
    expect(source).toContain('label="Anbieter-ID"');
    expect(source).toContain("value={primaryMapping.provider}");
    expect(source).toContain("value={String(primaryMapping.providerClubId)}");
  });
});
