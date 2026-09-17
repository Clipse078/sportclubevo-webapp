import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("AddFacilityResourceButton", () => {
  it("uses SCE secondary dark styling without legacy white surfaces", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/facilities/AddFacilityResourceButton.tsx"),
      "utf8",
    );
    expect(source).toContain("bg-transparent");
    expect(source).toContain("border-[var(--border)]");
    expect(source).toContain("text-[var(--muted)]");
    expect(source).not.toContain("bg-slate-50");
    expect(source).not.toContain("bg-white");
  });
});
