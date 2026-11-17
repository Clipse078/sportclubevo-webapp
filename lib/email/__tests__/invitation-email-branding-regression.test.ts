import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC } from "@/lib/branding/sportclubevo-platform-wordmark";
import { buildInvitationEmail } from "@/lib/email/templates/invitation";
import { INVITATION_PREVIEW_SAMPLE_ACCEPT_URL } from "@/lib/email/templates/invitation-preview-samples";
import {
  TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN,
  resolveTransactionalSceEmailLogoAbsoluteUrl,
} from "@/lib/email/resolve-transactional-sce-email-logo-url";

const LOGO_PUBLIC_PATH = path.join(
  process.cwd(),
  "public",
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC.replace(/^\//, ""),
);

describe("invitation email branding regression", () => {
  const outboundLogo = resolveTransactionalSceEmailLogoAbsoluteUrl({
    APP_BASE_URL: TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN,
  });

  it.each(["new_account", "existing_account"] as const)(
    "outbound HTML references canonical logo without vercel hosts (%s)",
    (variant) => {
      const { html } = buildInvitationEmail({
        inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
        recipientEmail: "x@example.test",
        recipientFirstName: "Test",
        tenantName: "FC Allschwil",
        expiryHours: 72,
        sceLogoAbsoluteUrl: outboundLogo,
        variant,
      });
      expect(html).toContain(`src="${outboundLogo}"`);
      expect(html).not.toContain("vercel.app");
      expect(html).not.toMatch(/src="cid:/);
    },
  );

  it("admin preview HTML can use embedded data-uri logo src", () => {
    const previewLogo = "data:image/png;base64,previewfixture=";
    const { html } = buildInvitationEmail({
      inviteUrl: INVITATION_PREVIEW_SAMPLE_ACCEPT_URL,
      recipientEmail: "x@example.test",
      recipientFirstName: "Test",
      tenantName: "FC Allschwil",
      expiryHours: 72,
      sceLogoAbsoluteUrl: previewLogo,
      variant: "existing_account",
    });
    expect(html).toContain(`src="${previewLogo}"`);
    expect(html).not.toMatch(
      /src="https:\/\/fcallschwil\.sportclubevo\.com\/images\/branding\/sportclubevo_logo\.png"/,
    );
  });

  it("bundled SCE logo file is valid PNG", () => {
    const bytes = readFileSync(LOGO_PUBLIC_PATH);
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("canonical remote logo responds as image/png without vercel.app", async () => {
    const response = await fetch(outboundLogo, { method: "HEAD" });
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")?.toLowerCase()).toContain("image/png");
    expect(response.url).not.toContain("vercel.app");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
  });
});