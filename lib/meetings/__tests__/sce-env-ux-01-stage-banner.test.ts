import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-ENV-UX-01 tenant-facing STAGE banner removal", () => {
  it("does not mount StageEnvironmentBanner in the authenticated admin shell", () => {
    const layout = readSrc("app/(admin)/layout.tsx");
    expect(layout).not.toContain("<StageEnvironmentBanner");
    expect(layout).toContain("ImpersonationSafetyChrome");
    expect(layout).toContain("sce-authenticated-sticky-shell-chrome");
  });

  it("retains StageEnvironmentBanner component for internal diagnostics reuse", () => {
    expect(readSrc("components/admin/deployment/StageEnvironmentBanner.tsx")).toContain(
      "getRuntimeEnvironment",
    );
  });
});
