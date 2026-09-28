import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_APPROVED_AUTHENTICATED_APP_BACKGROUND_SHA256,
  SCE_AUTHENTICATED_APP_BACKGROUND_CACHE_VERSION,
  SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE,
  SCE_AUTHENTICATED_APP_BACKGROUND_PATH,
  SCE_AUTHENTICATED_APP_BACKGROUND_URL,
} from "@/lib/shell/sce-app-background";

const LEGACY_AUTHENTICATED_APP_BACKGROUND_SHA256 =
  "f381d54605073afbf95a366121d615396801b8e6bb248bc08fb17b9e6af8280a";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function sha256File(relativePublicPath: string): string {
  const diskPath = join(process.cwd(), "public", relativePublicPath);
  const bytes = readFileSync(diskPath);
  return createHash("sha256").update(bytes).digest("hex");
}

describe("SCE-UX-BG-01R2 — approved background asset fingerprint and cache busting", () => {
  it("matches the approved PNG bytes via SHA-256 regression contract", () => {
    const relativePublic = SCE_AUTHENTICATED_APP_BACKGROUND_PATH.replace(/^\//, "");
    const onDisk = sha256File(relativePublic);

    expect(onDisk).toBe(SCE_APPROVED_AUTHENTICATED_APP_BACKGROUND_SHA256);
    expect(onDisk).not.toBe(LEGACY_AUTHENTICATED_APP_BACKGROUND_SHA256);
  });

  it("serves the physical asset at the canonical public path (no query string on disk)", () => {
    const relativePublic = SCE_AUTHENTICATED_APP_BACKGROUND_PATH.replace(/^\//, "");
    const diskPath = join(process.cwd(), "public", relativePublic);
    expect(existsSync(diskPath)).toBe(true);
    expect(relativePublic).toBe("images/background/SCE_background.png");
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_PATH).toBe(
      "/images/background/SCE_background.png",
    );
  });

  it("exposes a stable cache-busted rendered URL separate from the physical path", () => {
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_CACHE_VERSION).toBe(2);
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_URL).toBe(
      "/images/background/SCE_background.png?v=2",
    );
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE).toBe(
      'url("/images/background/SCE_background.png?v=2")',
    );
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_URL).not.toBe(
      SCE_AUTHENTICATED_APP_BACKGROUND_PATH,
    );
  });

  it("wires globals.css to the cache-busted canonical background image token", () => {
    const globalsCss = readRelative("app/globals.css");
    expect(globalsCss).toContain(
      `--sce-app-background-image: ${SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE}`,
    );
    expect(globalsCss).not.toContain(
      '--sce-app-background-image: url("/images/background/SCE_background.png");',
    );
  });

  it("authenticated shell renders via the cache-busted CSS variable without new visual effects", () => {
    const shellCss = readRelative("app/(admin)/authenticated-shell.css");
    expect(shellCss).toContain("background-image: var(--sce-app-background-image)");
    expect(shellCss).toContain("background-size: cover");
    expect(shellCss).toContain("background-position: center center");
    expect(shellCss).toContain("background-repeat: no-repeat");
    expect(shellCss).toContain("background-attachment: scroll");
    expect(shellCss).toMatch(/@media \(min-width: 768px\)[\s\S]*background-attachment: fixed/);
    expect(shellCss).not.toMatch(/opacity|filter|gradient|blur/);
    expect(shellCss).not.toMatch(/SCE_background\.png\?v=/);
  });
});
