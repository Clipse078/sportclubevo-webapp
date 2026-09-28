// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import VorlageUsagePanel from "@/components/admin/communication/vorlagen/VorlageUsagePanel";
import ZielgruppeUsagePanel from "@/components/admin/communication/zielgruppen/ZielgruppeUsagePanel";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const COMMUNICATION_ROUTE_PAGES = [
  "app/(admin)/dashboard/communication/page.tsx",
  "app/(admin)/dashboard/communication/inbox/page.tsx",
  "app/(admin)/dashboard/communication/inbox/new/page.tsx",
  "app/(admin)/dashboard/communication/inbox/settings/page.tsx",
  "app/(admin)/dashboard/communication/mitteilungen/page.tsx",
  "app/(admin)/dashboard/communication/mitteilungen/new/page.tsx",
  "app/(admin)/dashboard/communication/mitteilungen/[id]/page.tsx",
  "app/(admin)/dashboard/communication/kampagnen/page.tsx",
  "app/(admin)/dashboard/communication/kampagnen/new/page.tsx",
  "app/(admin)/dashboard/communication/kampagnen/[id]/page.tsx",
  "app/(admin)/dashboard/communication/zielgruppen/page.tsx",
  "app/(admin)/dashboard/communication/zielgruppen/new/page.tsx",
  "app/(admin)/dashboard/communication/zielgruppen/[id]/page.tsx",
  "app/(admin)/dashboard/communication/vorlagen/page.tsx",
  "app/(admin)/dashboard/communication/vorlagen/new/page.tsx",
  "app/(admin)/dashboard/communication/vorlagen/[id]/page.tsx",
  "app/(admin)/dashboard/communication/email-sender/page.tsx",
  "app/(admin)/dashboard/communication/personal-signature/page.tsx",
];

describe("SCE-COMM-UX-09 — cross-surface polish contracts", () => {
  it("uses CommunicationWorkspaceHeader on all primary communication routes", () => {
    for (const route of COMMUNICATION_ROUTE_PAGES) {
      const source = readRelative(route);
      expect(source, route).toContain("CommunicationWorkspaceHeader");
    }
  });

  it("aligns inbox settings with shared content surface", () => {
    const settings = readRelative("app/(admin)/dashboard/communication/inbox/settings/page.tsx");
    expect(settings).toContain("CommunicationContentSurface");
    expect(settings).not.toContain("PageHeader");
  });

  it("does not expose ticket IDs in email-sender user copy", () => {
    const workspace = readRelative("components/admin/communication/email-sender/EmailSenderWorkspace.tsx");
    const display = readRelative("lib/communication/email-sender-display.ts");
    expect(workspace).not.toMatch(/\(COMM-\d+\)/);
    expect(display).not.toMatch(/\(COMM-\d+\)/);
    expect(display).toContain("broadcastNote");
    expect(display).not.toMatch(/broadcastNote:[\s\S]*COMM-/);
  });

  it("humanizes template and zielgruppe usage status in UI", () => {
    render(
      <VorlageUsagePanel
        usage={{
          totalCount: 1,
          truncated: false,
          references: [
            {
              id: "c1",
              kind: "CAMPAIGN",
              status: "DRAFT",
              label: "Sommerkampagne",
              href: "/dashboard/communication/kampagnen/c1",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText(/Status: Entwurf/)).toBeInTheDocument();
    expect(screen.queryByText(/DRAFT/)).not.toBeInTheDocument();

    render(
      <ZielgruppeUsagePanel
        usage={{
          truncated: false,
          references: [
            {
              kind: "CLUB_MESSAGE",
              id: "m1",
              label: "Trainingsinfo",
              href: "/dashboard/communication/mitteilungen/m1",
              statusHint: "PUBLISHED",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Gesendet")).toBeInTheDocument();
  });

  it("uses mailbox totals for inbox reading-pane empty guidance", () => {
    const workspace = readRelative("components/admin/communication/inbox/CommunicationInboxWorkspace.tsx");
    expect(workspace).toContain("mailboxCounts[mailbox]");
    expect(workspace).toContain("hasAnyConversationsInMailbox");
  });

  it("removes non-functional inbox overflow action stubs", () => {
    const detailToolbar = readRelative(
      "components/admin/communication/inbox/CommunicationInboxConversationActionsToolbar.tsx",
    );
    const bulkToolbar = readRelative("components/admin/communication/inbox/CommunicationInboxBulkToolbar.tsx");
    expect(detailToolbar).not.toContain("Weitere Aktionen");
    expect(bulkToolbar).not.toContain("Weitere Aktionen");
  });

  it("defines reading-pane subject heading and focus target for screen readers", () => {
    const detail = readRelative(
      "components/admin/communication/inbox/CommunicationInboxConversationDetail.tsx",
    );
    expect(detail).toContain("<h2");
    expect(detail).toContain("detailFocusRef");
  });

  it("allows horizontal scroll for wide list tables on tablet/desktop", () => {
    const vorlagen = readRelative("app/(admin)/dashboard/communication/vorlagen/page.tsx");
    const zielgruppen = readRelative("app/(admin)/dashboard/communication/zielgruppen/page.tsx");
    expect(vorlagen).toContain("overflow-x-auto");
    expect(zielgruppen).toContain("overflow-x-auto");
  });

  it("maps mailbox configuration status labels for settings UI", () => {
    const form = readRelative("components/admin/communication/inbox/CommunicationMailboxSettingsForm.tsx");
    expect(form).toContain("inboxMailboxStatusLabel");
  });

  it("returns focus to inbox view control trigger after closing the menu", () => {
    const viewControl = readRelative("components/admin/communication/inbox/CommunicationInboxViewControl.tsx");
    expect(viewControl).toContain("triggerRef");
    expect(viewControl).toContain("closeMenu");
  });

  it("keeps canonical SCE background asset unchanged", () => {
    const globals = readRelative("app/globals.css");
    expect(globals).toContain("/images/background/SCE_background.png?v=2");
  });
});
