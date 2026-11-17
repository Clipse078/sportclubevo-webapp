import { describe, expect, it } from "vitest";
import { SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC } from "@/lib/branding/sportclubevo-platform-wordmark";
import { resolveAdminInvitationEmailPreviewLogoUrl } from "@/lib/email/resolve-admin-invitation-email-preview-logo-url";
import {
  TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN,
  resolveTransactionalSceEmailLogoAbsoluteUrl,
} from "@/lib/email/resolve-transactional-sce-email-logo-url";

const PREVIEW_HOST =
  "sportclubevo-webapp-stage-git-curs-c7ecf7-mds-projects-462da62c.vercel.app";

function mockRequest(input: {
  host?: string;
  proto?: string;
  nextHost?: string;
}) {
  return {
    nextUrl: new URL(`https://${input.nextHost ?? input.host ?? "localhost"}/`),
    headers: new Headers({
      ...(input.host ? { host: input.host, "x-forwarded-host": input.host } : {}),
      ...(input.proto ? { "x-forwarded-proto": input.proto } : {}),
    }),
  };
}

describe("resolveAdminInvitationEmailPreviewLogoUrl", () => {
  it("uses same-origin relative path on vercel preview hosts", () => {
    const url = resolveAdminInvitationEmailPreviewLogoUrl(
      mockRequest({ host: PREVIEW_HOST, proto: "https" }),
    );
    expect(url).toBe(SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC);
    expect(url).not.toContain("vercel.app");
    expect(url).not.toContain(TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN);
  });

  it("uses deployment origin for tenant custom domains", () => {
    const url = resolveAdminInvitationEmailPreviewLogoUrl(
      mockRequest({ host: "fcallschwil.sportclubevo.com", proto: "https" }),
    );
    expect(url).toBe(
      `https://fcallschwil.sportclubevo.com${SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC}`,
    );
  });

  it("differs from outbound canonical when admin page is on vercel", () => {
    const adminPreview = resolveAdminInvitationEmailPreviewLogoUrl(
      mockRequest({ host: PREVIEW_HOST, proto: "https" }),
    );
    const outbound = resolveTransactionalSceEmailLogoAbsoluteUrl({
      VERCEL_URL: PREVIEW_HOST,
      NEXTAUTH_URL: `https://${PREVIEW_HOST}`,
    });
    expect(adminPreview).not.toBe(outbound);
    expect(outbound).toContain(TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN);
  });
});