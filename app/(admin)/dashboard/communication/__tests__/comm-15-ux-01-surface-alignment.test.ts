import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DASHBOARD_MODULE_PAGE_SURFACE,
  SCE_SURFACE_STANDARD_PANEL,
} from "@/lib/shell/sce-surface-system";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-COMM-15-UX-01 — Communication Center surface alignment", () => {
  it("shares canonical dense module page surface on inbox routes via layout", () => {
    const layout = readRelative("app/(admin)/dashboard/communication/inbox/layout.tsx");
    expect(layout).toContain("SCE_DASHBOARD_MODULE_PAGE_SURFACE");
    expect(SCE_DASHBOARD_MODULE_PAGE_SURFACE).toContain("var(--sce-surface-dense)");
  });

  it("does not serialize mailbox credentials on the settings page loader", () => {
    const page = readRelative("app/(admin)/dashboard/communication/inbox/settings/page.tsx");
    const form = readRelative(
      "components/admin/communication/inbox/CommunicationMailboxSettingsForm.tsx",
    );
    const apiRoute = readRelative("app/api/communication/inbox/mailboxes/route.ts");

    expect(page).toContain("listCommunicationCenterMailboxes");
    expect(page).not.toMatch(/credential(Encrypted)?/);
    expect(form).toContain("hasCredential");
    expect(form).not.toMatch(/value=\{[^}]*credential[^}]*mailbox/);
    expect(apiRoute).toContain("listCommunicationCenterMailboxes");
    expect(apiRoute).not.toMatch(/credentialEncrypted/);
  });

  it("uses standard elevated panels in inbox workspace and settings form", () => {
    const workspace = readRelative(
      "components/admin/communication/inbox/CommunicationInboxWorkspace.tsx",
    );
    const settings = readRelative(
      "components/admin/communication/inbox/CommunicationMailboxSettingsForm.tsx",
    );

    expect(workspace).toContain("SCE_SURFACE_STANDARD_PANEL");
    expect(settings).toContain("SCE_SURFACE_STANDARD_PANEL");
    expect(settings).toContain("mailbox-credential-visibility-toggle");
    expect(settings).toContain('type={showCredential ? "text" : "password"}');
    expect(SCE_SURFACE_STANDARD_PANEL).toContain("var(--sce-surface-standard)");

    expect(workspace).not.toContain("--surface-1");
    expect(settings).not.toMatch(/border border-\[var\(--border\)\] p-4/);
  });
});
