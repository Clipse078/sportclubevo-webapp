import { describe, expect, it } from "vitest";
import { buildInvitationEmail } from "@/lib/email/templates/invitation";
import { INVITATION_PREVIEW_SAMPLE_ACCEPT_URL } from "@/lib/email/templates/invitation-preview-samples";

describe("invitation email template", () => {
  it("uses FC Allschwil subject and copper CTA", () => {
    const { subject, html, text } = buildInvitationEmail({
      inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
      recipientEmail: "irem.uysal@fcallschwil.ch",
      recipientFirstName: "Irem",
      tenantName: "FC Allschwil",
      inviterDisplayName: "Patrick Scotton",
      expiryHours: 72,
      appBaseUrl: "https://fcallschwil.sportclubevo.com",
      variant: "existing_account",
      accessSummary: "Vereinsleitung — Vereinsentwicklung",
    });
    expect(subject).toBe("Einladung zu FC Allschwil auf SportClubEvo");
    expect(html).toContain("Einladung annehmen");
    expect(html).toContain("#B87333");
    expect(html).not.toContain("Konto aktivieren");
    expect(text).toContain("kein neues Konto");
    expect(html).toContain("SportClubEvo");
  });

  it("escapes malicious html in tenant name", () => {
    const { html } = buildInvitationEmail({
      inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
      recipientEmail: "x@y.ch",
      recipientFirstName: "Test",
      tenantName: `<script>alert(1)</script>`,
      expiryHours: 24,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});