import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_AUTHENTICATED_APP_BACKGROUND_POSITION,
  SCE_AUTHENTICATED_APP_BACKGROUND_POSITION_VAR,
  SCE_AUTHENTICATED_APP_SHELL_CLASS,
} from "@/lib/shell/sce-app-background";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-FCA-ADMIN-UX-IMPERSONATION-01R1 — canonical shell background positioning", () => {
  it("top-anchors the approved PNG via a single CSS variable (no vertical centering)", () => {
    const globalsCss = readRelative("app/globals.css");
    const shellCss = readRelative("app/(admin)/authenticated-shell.css");

    expect(SCE_AUTHENTICATED_APP_BACKGROUND_POSITION).toBe("center top");
    expect(globalsCss).toContain(
      `${SCE_AUTHENTICATED_APP_BACKGROUND_POSITION_VAR}: ${SCE_AUTHENTICATED_APP_BACKGROUND_POSITION}`,
    );
    expect(shellCss).toContain(
      `background-position: var(${SCE_AUTHENTICATED_APP_BACKGROUND_POSITION_VAR})`,
    );
    expect(shellCss).not.toMatch(/background-position:\s*center\s*;/);
    expect(shellCss).not.toMatch(/background-position:[^;]*\d+px/);
  });

  it("keeps cover + no-repeat + scroll/fixed attachment without shell overlays on the artwork", () => {
    const shellCss = readRelative("app/(admin)/authenticated-shell.css");

    expect(shellCss).toContain("background-size: cover");
    expect(shellCss).toContain("background-repeat: no-repeat");
    expect(shellCss).toContain("background-attachment: scroll");
    expect(shellCss).toMatch(/@media \(min-width: 768px\)[\s\S]*background-attachment: fixed/);
    expect(shellCss).not.toMatch(/opacity|filter|gradient|blur/);
  });

  it("does not paint the SCE artwork on html/body or page wrappers", () => {
    const globalsCss = readRelative("app/globals.css");
    const adminLayout = readRelative("app/(admin)/layout.tsx");
    const personDetailPage = readRelative(
      "app/(admin)/dashboard/admin/users/[userId]/page.tsx",
    );
    const personWorkspacePage = readRelative("app/(admin)/dashboard/persons/[id]/page.tsx");

    expect(globalsCss).not.toMatch(/^\s*body\s*\{[\s\S]*background-image/m);
    expect(globalsCss).not.toMatch(/^\s*html\s*\{[\s\S]*background-image/m);
    expect(adminLayout).toContain("SCE_AUTHENTICATED_APP_SHELL_CLASS");
    expect(adminLayout).toContain("data-sce-modal-background");
    expect(personDetailPage).not.toMatch(/background-image|SCE_background/);
    expect(personWorkspacePage).not.toMatch(/background-image|SCE_background/);
  });
});
