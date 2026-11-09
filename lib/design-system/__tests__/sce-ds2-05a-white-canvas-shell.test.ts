/**
 * SCE-DS2-05A — global white canvas + authenticated shell primitives
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_05A_DOC_MARKERS,
  SCE_DS2_05A_PACKAGE_KEY,
  SCE_DS2_05A_SHELL_SURFACE_SELECTORS,
} from "@/lib/design-system/sce-ds2-05a-meta";
import {
  SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT,
} from "@/lib/design-system/sce-ds2-01-meta";
import {
  isSceWhiteEditionEnabled,
  sceWhiteEditionThemeDataAttributes,
} from "@/lib/design-system/sce-white-edition-flag";
import {
  resolveSceWhiteEditionPilotSnapshot,
  SCE_WHITE_EDITION_STAGE_PILOT_ACTIVATION_VALUE,
  SCE_WHITE_EDITION_STAGE_PILOT_APP_ENV,
  SCE_WHITE_EDITION_STAGE_PILOT_ENV_VAR,
  SCE_WHITE_EDITION_STAGE_PILOT_STEPS,
} from "@/lib/design-system/sce-white-edition-stage-pilot";
import { SCE_WORKSPACE_SURFACE_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05A white canvas + authenticated shell", () => {
  it("documents the package markers and delivery note", () => {
    expect(readRepo("docs/design-system-v2/16-ds2-05a-white-canvas-shell-delivery.md")).toContain(
      SCE_DS2_05A_PACKAGE_KEY,
    );
    const sources = [
      readRepo("app/globals.css"),
      readRepo("app/(admin)/authenticated-shell.css"),
      readRepo("app/(admin)/global-app-navigation.css"),
      readRepo("lib/sce/workspace/sce-workspace-layout.ts"),
      readRepo("components/admin/layout/GlobalNavDrawer.tsx"),
    ].join("\n");
    for (const marker of SCE_DS2_05A_DOC_MARKERS) {
      if (marker.startsWith("docs/")) continue;
      expect(sources).toContain(marker);
    }
    expect(SCE_DS2_05A_SHELL_SURFACE_SELECTORS.length).toBeGreaterThanOrEqual(5);
  });

  it("removes tactical PNG and enforces solid white canvas under the white theme", () => {
    const globals = readRepo("app/globals.css");
    expect(globals).toMatch(
      /\[data-sce-theme="white"\][\s\S]*--sce-app-background-image:\s*none/,
    );
    expect(globals).toMatch(
      /\[data-sce-theme="white"\][\s\S]*--sce-app-background:\s*#ffffff/,
    );

    const shellCss = readRepo("app/(admin)/authenticated-shell.css");
    expect(shellCss).toMatch(
      /\[data-sce-theme="white"\][\s\S]*background-image:\s*none/,
    );
  });

  it("tunes shared workspace surfaces without dark backdrop-blur on white", () => {
    expect(SCE_WORKSPACE_SURFACE_CLASS).toContain("sce-workspace-surface");
    const globals = readRepo("app/globals.css");
    expect(globals).toMatch(
      /\[data-sce-theme="white"\]\s*\.sce-workspace-surface[\s\S]*backdrop-filter:\s*none/,
    );
  });

  it("uses light navigation panels and explorer drawer under white edition", () => {
    const navCss = readRepo("app/(admin)/global-app-navigation.css");
    expect(navCss).toMatch(
      /\[data-sce-theme="white"\]\s*\.sce-context-nav-panel[\s\S]*var\(--sce-color-surface-standard\)/,
    );
    expect(navCss).toMatch(
      /\[data-sce-theme="white"\]\s*\.sce-global-nav-drawer-panel[\s\S]*backdrop-filter:\s*none/,
    );

    const drawer = readRepo("components/admin/layout/GlobalNavDrawer.tsx");
    expect(drawer).toContain("sce-global-nav-drawer-panel");
    expect(drawer).not.toContain("rgba(15,23,42");
  });

  it("keeps dark fallback when the feature flag is off", () => {
    expect(SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT).toBe(false);
    expect(
      isSceWhiteEditionEnabled({ SCE_WHITE_EDITION: undefined } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      isSceWhiteEditionEnabled({ SCE_WHITE_EDITION: "0" } as NodeJS.ProcessEnv),
    ).toBe(false);
    const prev = process.env.SCE_WHITE_EDITION;
    delete process.env.SCE_WHITE_EDITION;
    expect(sceWhiteEditionThemeDataAttributes()).toBeUndefined();
    if (prev === undefined) {
      delete process.env.SCE_WHITE_EDITION;
    } else {
      process.env.SCE_WHITE_EDITION = prev;
    }

    const globals = readRepo("app/globals.css");
    expect(globals).toContain('--sce-app-background-image: url("/images/background/SCE_background.png?v=2")');
  });

  it("documents STAGE-only pilot activation without auto-enable on production", () => {
    expect(SCE_WHITE_EDITION_STAGE_PILOT_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(SCE_WHITE_EDITION_STAGE_PILOT_APP_ENV).toBe("stage");
    expect(SCE_WHITE_EDITION_STAGE_PILOT_ENV_VAR).toBe("SCE_WHITE_EDITION");

    const prodSnapshot = resolveSceWhiteEditionPilotSnapshot({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      APP_ENV: "prod",
      SCE_WHITE_EDITION: SCE_WHITE_EDITION_STAGE_PILOT_ACTIVATION_VALUE,
    } as NodeJS.ProcessEnv);
    expect(prodSnapshot.isStageRuntime).toBe(false);
    expect(prodSnapshot.pilotEligible).toBe(false);

    const stageOff = resolveSceWhiteEditionPilotSnapshot({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      APP_ENV: SCE_WHITE_EDITION_STAGE_PILOT_APP_ENV,
      SCE_WHITE_EDITION: undefined,
    } as NodeJS.ProcessEnv);
    expect(stageOff.isStageRuntime).toBe(true);
    expect(stageOff.flagEnabled).toBe(false);
    expect(stageOff.pilotEligible).toBe(false);

    const stageOn = resolveSceWhiteEditionPilotSnapshot({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      APP_ENV: SCE_WHITE_EDITION_STAGE_PILOT_APP_ENV,
      SCE_WHITE_EDITION: "1",
    } as NodeJS.ProcessEnv);
    expect(stageOn.pilotEligible).toBe(true);
  });

  it("wires the admin layout white theme hook from the feature flag helper", () => {
    const layout = readRepo("app/(admin)/layout.tsx");
    expect(layout).toContain("sceWhiteEditionThemeDataAttributes");
    expect(layout).toContain("...whiteEditionTheme");
  });
});
