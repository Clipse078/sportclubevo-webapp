import { describe, expect, it } from "vitest";
import {
  parseAndValidateBulkInvitationEmails,
  validNormalizedBulkEmails,
} from "@/lib/admin/vl-onboarding/bulk-invitation-emails";
import { FCA_VL_INVITATION_CONFIRMED_EMAILS } from "@/lib/admin/vl-onboarding/fca-vl-confirmed-invitee-emails";

describe("bulk invitation email parse", () => {
  it("deduplicates and validates confirmed roster paste", () => {
    const raw = [
      ...FCA_VL_INVITATION_CONFIRMED_EMAILS,
      FCA_VL_INVITATION_CONFIRMED_EMAILS[0],
      "not-an-email",
    ].join("\n");
    const rows = parseAndValidateBulkInvitationEmails(raw);
    expect(rows.length).toBeGreaterThan(FCA_VL_INVITATION_CONFIRMED_EMAILS.length);
    expect(rows.find((r) => r.raw === "not-an-email")?.valid).toBe(false);
    const valid = validNormalizedBulkEmails(rows);
    expect(valid).toHaveLength(FCA_VL_INVITATION_CONFIRMED_EMAILS.length);
  });
});