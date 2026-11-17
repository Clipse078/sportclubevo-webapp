import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC } from "@/lib/branding/sportclubevo-platform-wordmark";
import { INVITATION_PREVIEW_NEUTRAL_INVITER_ATTRIBUTION } from "@/lib/email/templates/invitation-preview-samples";

vi.mock("server-only", () => ({}));

const requireApiPermissionMock = vi.hoisted(() => vi.fn());
const resolveInviterMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: requireApiPermissionMock,
}));

vi.mock("@/lib/admin/vl-onboarding/resolve-invitation-inviter-display-name", () => ({
  resolveInvitationInviterDisplayName: resolveInviterMock,
  resolveInvitationPreviewInviterDisplayName: (name: string | undefined) =>
    name?.trim() || INVITATION_PREVIEW_NEUTRAL_INVITER_ATTRIBUTION,
}));

vi.mock("@/lib/server/security-link-url", () => ({
  resolveSecurityLinkBaseUrl: () => new URL("https://fcallschwil.sportclubevo.com"),
}));

import { POST } from "@/app/api/admin/vl-invitations/preview-email/route";

const PREVIEW_HOST =
  "sportclubevo-webapp-stage-git-curs-c7ecf7-mds-projects-462da62c.vercel.app";

describe("POST /api/admin/vl-invitations/preview-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiPermissionMock.mockResolvedValue({
      ok: true,
      session: {
        user: { id: "actor-1", effectiveUserId: "effective-1", activeTenantId: "tenant-fca" },
      },
    });
    resolveInviterMock.mockResolvedValue("Admin Vorschau");
  });

  function postPreview(variant: "new_account" | "existing_account") {
    const req = new NextRequest(`https://${PREVIEW_HOST}/api/admin/vl-invitations/preview-email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: PREVIEW_HOST,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({ variant }),
    });
    return POST(req);
  }

  it("embeds bundled logo data URI suitable for in-page and sandboxed iframe preview", async () => {
    const res = await postPreview("existing_account");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { html: string };
    expect(body.html).toMatch(/src="data:image\/png;base64,[A-Za-z0-9+/=]+"/);
    expect(body.html).not.toContain(`src="${SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC}"`);
    expect(body.html).not.toContain("fcallschwil.sportclubevo.com/images/branding");
    expect(body.html).not.toContain("vercel.app");
  });

  it("uses effective actor inviter, not Patrick Scotton", async () => {
    const res = await postPreview("new_account");
    const body = (await res.json()) as { html: string; text: string };
    expect(resolveInviterMock).toHaveBeenCalledWith("effective-1");
    expect(body.html).toContain("Admin Vorschau hat dich eingeladen");
    expect(body.html).not.toContain("Patrick Scotton");
    expect(body.text).not.toContain("Patrick Scotton");
  });

  it("falls back to neutral sample inviter when actor name is missing", async () => {
    resolveInviterMock.mockResolvedValue(undefined);
    const res = await postPreview("new_account");
    const body = (await res.json()) as { html: string };
    expect(body.html).toContain(INVITATION_PREVIEW_NEUTRAL_INVITER_ATTRIBUTION);
    expect(body.html).not.toContain("Patrick Scotton");
  });
});