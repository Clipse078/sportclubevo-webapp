import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const requireApiPermissionMock = vi.hoisted(() => vi.fn());
const prismaTenantFindUnique = vi.hoisted(() => vi.fn());
const buildPreviewMock = vi.hoisted(() => vi.fn());
const resolveVariantMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: requireApiPermissionMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: { findUnique: prismaTenantFindUnique },
  },
}));

vi.mock("@/lib/admin/vl-onboarding/vl-standard-invite-personalized-preview", () => ({
  buildVlStandardInvitePersonalizedEmailPreview: buildPreviewMock,
}));

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-email-content", () => ({
  resolveVlInvitationEmailVariant: resolveVariantMock,
}));

import { POST } from "@/app/api/admin/people-access/vl-invite/preview-email/route";
import { resolveAdminInvitationEmailPreviewLogoSrc } from "@/lib/email/admin-invitation-email-preview-logo-src";

describe("POST /api/admin/people-access/vl-invite/preview-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiPermissionMock.mockResolvedValue({
      ok: true,
      session: {
        user: { id: "actor-1", effectiveUserId: "effective-1", activeTenantId: "tenant-fca" },
      },
    });
    prismaTenantFindUnique.mockResolvedValue({ key: "fc-allschwil" });
    resolveVariantMock.mockResolvedValue("new_account");
    buildPreviewMock.mockResolvedValue({
      preview: true,
      subject: "Test",
      html: '<img src="data:image/png;base64,abc" />',
      text: "Test",
      variant: "new_account",
    });
  });

  it("passes shared admin preview logo src into personalized builder", async () => {
    const host = "fcallschwil.sportclubevo.com";
    const req = new NextRequest(`https://${host}/api/admin/people-access/vl-invite/preview-email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host,
        "x-forwarded-host": host,
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({ email: "irem.uysal@fcallschwil.ch", firstName: "Irem" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const expectedLogo = resolveAdminInvitationEmailPreviewLogoSrc(req);
    expect(buildPreviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sceLogoAbsoluteUrl: expectedLogo,
        recipientEmail: "irem.uysal@fcallschwil.ch",
        recipientFirstName: "Irem",
        actorUserId: "effective-1",
      }),
    );
    expect(expectedLogo).toMatch(/^data:image\/png;base64,/);
  });
});