import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE,
  SCE_AUTHENTICATED_APP_BACKGROUND_PATH,
  SCE_AUTHENTICATED_APP_SHELL_CLASS,
} from "@/lib/shell/sce-app-background";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-VISUAL-01 global authenticated app background", () => {
  it("shell contract references the canonical public background asset once", () => {
    const adminLayout = readRelative("app/(admin)/layout.tsx");
    expect(adminLayout).toContain("SCE_AUTHENTICATED_APP_SHELL_CLASS");
    expect(adminLayout).toContain("${SCE_AUTHENTICATED_APP_SHELL_CLASS}");
    expect(adminLayout).toContain("data-sce-modal-background");
    expect(adminLayout.match(/SCE_background\.png/g) ?? []).toHaveLength(0);

    const globalsCss = readRelative("app/globals.css");
    expect(globalsCss).toContain(SCE_AUTHENTICATED_APP_BACKGROUND_PATH);
    expect(globalsCss).toContain(
      `--sce-app-background-image: ${SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE}`,
    );

    const shellCss = readRelative("app/(admin)/authenticated-shell.css");
    expect(shellCss).toContain(
      `[data-sce-modal-background].${SCE_AUTHENTICATED_APP_SHELL_CLASS}`,
    );
    expect(shellCss).toContain(`background-image: var(--sce-app-background-image)`);

    const adminLayoutImportsShellCss = readRelative("app/(admin)/layout.tsx");
    expect(adminLayoutImportsShellCss).toContain("./authenticated-shell.css");
  });

  it("does not assign the authenticated background on root body/html or public shells", () => {
    const css = readRelative("app/globals.css");
    expect(css).not.toMatch(/^\s*body\s*\{[\s\S]*--sce-app-background-image/m);
    expect(css).not.toMatch(/^\s*html\s*\{[\s\S]*--sce-app-background-image/m);

    const rootLayout = readRelative("app/layout.tsx");
    expect(rootLayout).not.toContain(SCE_AUTHENTICATED_APP_SHELL_CLASS);
    expect(rootLayout).not.toContain(SCE_AUTHENTICATED_APP_BACKGROUND_PATH);

    const infoboardLayout = readRelative("app/infoboard/layout.tsx");
    expect(infoboardLayout).not.toContain(SCE_AUTHENTICATED_APP_SHELL_CLASS);
    expect(infoboardLayout).not.toContain(SCE_AUTHENTICATED_APP_BACKGROUND_PATH);

    const loginPage = readRelative("app/(auth)/login/page.tsx");
    expect(loginPage).not.toContain(SCE_AUTHENTICATED_APP_SHELL_CLASS);
  });

  it("does not duplicate background wiring across dashboard route pages", () => {
    const dashboardRoutes = [
      "app/(admin)/dashboard/planner/week/page.tsx",
      "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
      "app/(admin)/dashboard/matchcenter/[matchId]/page.tsx",
      "app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx",
      "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx",
    ];

    for (const routeFile of dashboardRoutes) {
      const source = readRelative(routeFile);
      expect(source).not.toContain(SCE_AUTHENTICATED_APP_BACKGROUND_PATH);
      expect(source).not.toContain(SCE_AUTHENTICATED_APP_SHELL_CLASS);
    }
  });

  it("preserves SceModalOverlay as the modal/sheet backdrop mechanism", () => {
    const overlaySource = readRelative("components/ui/SceModalOverlay.tsx");
    expect(overlaySource).toContain("SceModalOverlay");
    expect(overlaySource).toContain("sce-modal-overlay-backdrop");
    expect(overlaySource).toContain("[data-sce-modal-background]");

    const dialogSource = readRelative("components/ui/Dialog.tsx");
    expect(dialogSource).toContain("SceModalOverlay");

    const css = readRelative("app/globals.css");
    expect(css).toContain(".sce-modal-overlay-backdrop");
    expect(css).toContain("backdrop-filter: blur(10px)");
  });

  it("modal background roots must not receive shell opacity/filter overrides", () => {
    const shellCss = readRelative("app/(admin)/authenticated-shell.css");
    expect(shellCss).not.toMatch(/opacity/);
    expect(shellCss).not.toMatch(/filter/);
  });

  it("static asset resolves through the canonical public URL path", () => {
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_PATH).toBe(
      "/images/background/SCE_background.png",
    );
    const relativePublic = SCE_AUTHENTICATED_APP_BACKGROUND_PATH.replace(/^\//, "");
    expect(join("public", relativePublic)).toBe(
      "public/images/background/SCE_background.png",
    );
  });
});
