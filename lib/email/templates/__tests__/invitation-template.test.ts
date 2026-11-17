import { describe, expect, it } from "vitest";
import { SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC } from "@/lib/branding/sportclubevo-platform-wordmark";
import {
  INVITATION_EMAIL_SCE_LOGO_HEIGHT_PX,
  INVITATION_EMAIL_SCE_LOGO_WIDTH_PX,
  buildInvitationEmail,
} from "@/lib/email/templates/invitation";
import { INVITATION_PREVIEW_SAMPLE_ACCEPT_URL } from "@/lib/email/templates/invitation-preview-samples";
import { contrastRatio } from "@/lib/email/templates/invitation-cta-contrast";

const CANONICAL_LOGO_URL = `https://fcallschwil.sportclubevo.com${SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC}`;

describe("invitation email template", () => {
  it("uses FC Allschwil subject and #9A5F28 CTA with ≥4.5:1 contrast", () => {
    const { subject, html, text } = buildInvitationEmail({
      inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
      recipientEmail: "irem.uysal@fcallschwil.ch",
      recipientFirstName: "Irem",
      tenantName: "FC Allschwil",
      inviterDisplayName: "Patrick Scotton",
      expiryHours: 72,
      appBaseUrl: "https://fcallschwil.sportclubevo.com",
      sceLogoAbsoluteUrl: CANONICAL_LOGO_URL,
      variant: "existing_account",
      accessSummary: "Vereinsleitung — Vereinsentwicklung",
    });
    expect(subject).toBe("Einladung zu FC Allschwil auf SportClubEvo");
    expect(html).toContain("Einladung annehmen");
    expect(html).toContain("#9A5F28");
    expect(contrastRatio("#FFFFFF", "#9A5F28")).toBeGreaterThanOrEqual(4.5);
    expect(html).not.toContain("Konto aktivieren");
    expect(text).toContain("kein neues Konto");
    expect(html).toContain("SportClubEvo");
  });

  it.each(["new_account", "existing_account"] as const)(
    "embeds canonical SCE logo with explicit dimensions (%s)",
    (variant) => {
      const { html } = buildInvitationEmail({
        inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
        recipientEmail: "irem.uysal@fcallschwil.ch",
        recipientFirstName: "Irem",
        tenantName: "FC Allschwil",
        expiryHours: 72,
        sceLogoAbsoluteUrl: CANONICAL_LOGO_URL,
        variant,
      });

      expect(html).toContain(`src="${CANONICAL_LOGO_URL}"`);
      expect(html).toContain('alt="SportClubEvo"');
      expect(html).toContain(`width="${INVITATION_EMAIL_SCE_LOGO_WIDTH_PX}"`);
      expect(html).toContain(`height="${INVITATION_EMAIL_SCE_LOGO_HEIGHT_PX}"`);
      expect(html).not.toContain("vercel.app");
      expect(html).not.toContain("height=\"auto\"");
    },
  );

  it("prefers sceLogoAbsoluteUrl over vercel deployment appBaseUrl", () => {
    const previewHost =
      "https://sportclubevo-webapp-stage-git-curs-c7ecf7-mds-projects-462da62c.vercel.app";
    const { html } = buildInvitationEmail({
      inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
      recipientEmail: "x@y.ch",
      recipientFirstName: "Test",
      tenantName: "FC Allschwil",
      expiryHours: 72,
      appBaseUrl: previewHost,
      sceLogoAbsoluteUrl: CANONICAL_LOGO_URL,
    });
    expect(html).toContain(CANONICAL_LOGO_URL);
    expect(html).not.toContain(`${previewHost}/images/branding`);
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