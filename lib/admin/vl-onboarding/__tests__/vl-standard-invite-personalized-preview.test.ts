import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-email-content", () => ({
  buildVlInvitationEmailContent: vi.fn(async () => ({
    subject: "Einladung zu FC Allschwil auf SportClubEvo",
    html: "<p>personalisiert</p>",
    text: "personalisiert",
    variant: "new_account" as const,
  })),
}));

import { buildVlStandardInvitePersonalizedEmailPreview } from "@/lib/admin/vl-onboarding/vl-standard-invite-personalized-preview";
import { buildVlInvitationEmailContent } from "@/lib/admin/vl-onboarding/vl-invitation-email-content";

describe("buildVlStandardInvitePersonalizedEmailPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to shared VL invitation email builder", async () => {
    const preview = await buildVlStandardInvitePersonalizedEmailPreview({
      tenantId: "tenant-1",
      recipientEmail: "irem.uysal@fcallschwil.ch",
      recipientFirstName: "Irem",
      actorUserId: "actor-1",
    });
    expect(buildVlInvitationEmailContent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        recipientEmail: "irem.uysal@fcallschwil.ch",
        recipientFirstName: "Irem",
        actorUserId: "actor-1",
        inviteUrlOverride: expect.stringContaining("beispiel-vorschau"),
        sceLogoAbsoluteUrl: undefined,
      }),
    );
    expect(preview.subject).toContain("Einladung");
    expect(preview.preview).toBe(true);
  });
});