import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateTenantCssVars } from "@/lib/tenant-runtime/theme";
import {
  SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE,
  SCE_AUTHENTICATED_APP_BACKGROUND_PATH,
  SCE_AUTHENTICATED_APP_SHELL_CLASS,
} from "@/lib/shell/sce-app-background";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/** Legacy filenames that must not remain the authenticated default contract. */
const LEGACY_DEFAULT_BACKGROUND_HINTS = [
  "SCE_app_background",
  "sce-app-background.png",
  "dashboard-shell-background",
  "authenticated-background.jpg",
];

describe("SCE-UX-BG-01 — canonical default authenticated background", () => {
  it("resolves the canonical default to the approved public PNG path", () => {
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_PATH).toBe(
      "/images/background/SCE_background.png",
    );
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE).toBe(
      'url("/images/background/SCE_background.png")',
    );

    const globalsCss = readRelative("app/globals.css");
    expect(globalsCss).toContain(
      `--sce-app-background-image: ${SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE}`,
    );
  });

  it("wires the authenticated admin shell to the canonical default once", () => {
    const adminLayout = readRelative("app/(admin)/layout.tsx");
    expect(adminLayout).toContain("SCE_AUTHENTICATED_APP_SHELL_CLASS");
    expect(adminLayout).toContain("data-sce-modal-background");
    expect(adminLayout.match(/SCE_background\.png/g) ?? []).toHaveLength(0);

    const shellCss = readRelative("app/(admin)/authenticated-shell.css");
    expect(shellCss).toContain(
      `[data-sce-modal-background].${SCE_AUTHENTICATED_APP_SHELL_CLASS}`,
    );
    expect(shellCss).toContain("background-image: var(--sce-app-background-image)");
    expect(shellCss).toContain("background-size: cover");
    expect(shellCss).toContain("background-position: center center");
    expect(shellCss).toContain("background-repeat: no-repeat");
    expect(shellCss).not.toMatch(/opacity|filter|gradient/);
  });

  it("preserves explicit override layers (tenant theme + dashboard hero) separate from shell default", () => {
    const tenantVars = generateTenantCssVars({
      primaryColor: "#112233",
      secondaryColor: "#445566",
    });
    expect(tenantVars).not.toHaveProperty("--sce-app-background-image");
    expect(Object.keys(tenantVars)).not.toContain("--sce-app-background-image");

    const commandCenter = readRelative("lib/dashboard/command-center.ts");
    expect(commandCenter).toContain("heroBackgroundImageUrl");
    expect(commandCenter).not.toContain(SCE_AUTHENTICATED_APP_BACKGROUND_PATH);

    const loginPage = readRelative("app/(auth)/login/page.tsx");
    expect(loginPage).not.toContain(SCE_AUTHENTICATED_APP_SHELL_CLASS);
  });

  it("does not reference legacy default background assets in active shell wiring", () => {
    const shellSources = [
      readRelative("app/(admin)/layout.tsx"),
      readRelative("app/(admin)/authenticated-shell.css"),
      readRelative("lib/shell/sce-app-background.ts"),
    ].join("\n");

    for (const legacy of LEGACY_DEFAULT_BACKGROUND_HINTS) {
      expect(shellSources).not.toContain(legacy);
    }
  });

  it("serves the approved static asset from the public folder", () => {
    const relativePublic = SCE_AUTHENTICATED_APP_BACKGROUND_PATH.replace(/^\//, "");
    const diskPath = join(process.cwd(), "public", relativePublic);
    expect(existsSync(diskPath)).toBe(true);
    expect(relativePublic).toBe("images/background/SCE_background.png");
  });
});
