import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC } from "@/lib/branding/sportclubevo-platform-wordmark";
import { resolveAdminInvitationEmailPreviewLogoSrc } from "@/lib/email/admin-invitation-email-preview-logo-src";
import {
  TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN,
  resolveTransactionalSceEmailLogoAbsoluteUrl,
} from "@/lib/email/resolve-transactional-sce-email-logo-url";

const LOGO_PUBLIC_PATH = path.join(
  process.cwd(),
  "public",
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC.replace(/^\//, ""),
);

describe("resolveAdminInvitationEmailPreviewLogoSrc", () => {
  it("embeds the bundled PNG as a data URI", () => {
    const src = resolveAdminInvitationEmailPreviewLogoSrc();
    const bytes = readFileSync(LOGO_PUBLIC_PATH);
    expect(src).toBe(`data:image/png;base64,${bytes.toString("base64")}`);
  });

  it("differs from outbound canonical transactional logo URL", () => {
    const preview = resolveAdminInvitationEmailPreviewLogoSrc();
    const outbound = resolveTransactionalSceEmailLogoAbsoluteUrl();
    expect(preview).toMatch(/^data:image\/png;base64,/);
    expect(outbound).toContain(TRANSACTIONAL_EMAIL_ASSET_CANONICAL_FALLBACK_ORIGIN);
    expect(preview).not.toBe(outbound);
  });

  it("is stable across repeated calls", () => {
    const a = resolveAdminInvitationEmailPreviewLogoSrc();
    const b = resolveAdminInvitationEmailPreviewLogoSrc();
    expect(a).toBe(b);
  });
});