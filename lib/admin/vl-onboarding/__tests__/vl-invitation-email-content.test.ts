import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildVlInvitationEmailContent } from "@/lib/admin/vl-onboarding/vl-invitation-email-content";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(async () => ({ name: "FC Allschwil" })),
    },
    user: {
      findFirst: vi.fn(async () => null),
    },
  },
}));

vi.mock("@/lib/server/security-link-url", () => ({
  resolveSecurityLinkBaseUrl: () => new URL("https://fcallschwil.sportclubevo.com"),
  buildPasswordResetLink: (token: string) =>
    `https://fcallschwil.sportclubevo.com/einladung/${token}`,
}));

describe("buildVlInvitationEmailContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matches reviewed VL copy and CTA token", async () => {
    const content = await buildVlInvitationEmailContent({
      tenantId: "tenant-fca",
      recipientEmail: "irem.uysal@fcallschwil.ch",
      recipientFirstName: "Irem",
      rawToken: "fixture-token",
    });
    expect(content.subject).toBe("Einladung zu FC Allschwil auf SportClubEvo");
    expect(content.html).toContain("#9A5F28");
    expect(content.html).toContain("Vereinsleitung — Vereinsentwicklung");
    expect(content.text).toContain("Einladung annehmen");
  });
});