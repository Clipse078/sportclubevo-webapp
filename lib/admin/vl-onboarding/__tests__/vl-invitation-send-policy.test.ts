import { afterEach, describe, expect, it } from "vitest";
import {
  assertVlInvitationSendAllowed,
  mockInvitationTransport,
  VL_INVITATION_LIVE_SEND_ENV,
} from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";

describe("vl invitation send policy", () => {
  afterEach(() => {
    delete process.env[VL_INVITATION_LIVE_SEND_ENV];
  });

  it("defaults to dry-run rejection", () => {
    const result = assertVlInvitationSendAllowed(false);
    expect(result.ok).toBe(false);
    expect(result.mode).toBe("DRY_RUN");
    expect(result.error).toContain("Live-Versand ist deaktiviert");
  });

  it("mock transport never queues", () => {
    const row = mockInvitationTransport({
      recipientEmail: "irem.uysal@fcallschwil.ch",
      subject: "Einladung",
    });
    expect(row.queued).toBe(false);
    expect(row.mode).toBe("DRY_RUN");
  });
});