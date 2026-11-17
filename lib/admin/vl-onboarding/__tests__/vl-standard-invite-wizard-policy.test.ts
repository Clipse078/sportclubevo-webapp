import { describe, expect, it } from "vitest";
import {
  resolveVlStandardInviteLiveSendBlocker,
  resolveVlStandardInviteWizardBlocker,
} from "@/lib/admin/vl-onboarding/vl-standard-invite-wizard-policy";
import { PERSON_FUNCTIONS } from "@/lib/people/functions";

const base = {
  sendMode: "DRY_RUN" as const,
  canInvite: true,
  contributorRoleProvisioned: false,
  email: "test@fcallschwil.ch",
  firstName: "Test",
  lastName: "User",
  functionKey: PERSON_FUNCTIONS.BOARD_MEMBER,
  resolved: {
    email: "test@fcallschwil.ch",
    action: "NEW_INVITATION" as const,
    label: "Neue Einladung",
  },
};

describe("vl standard invite wizard policy", () => {
  it("allows dry-run when contributor role is missing", () => {
    expect(resolveVlStandardInviteWizardBlocker(base)).toBeNull();
  });

  it("blocks dry-run when VL access already complete", () => {
    const blocker = resolveVlStandardInviteWizardBlocker({
      ...base,
      resolved: { ...base.resolved, action: "EXISTING_ACCESS" },
    });
    expect(blocker).toContain("bereits vollständig");
  });

  it("blocks live send when contributor role is missing", () => {
    const blocker = resolveVlStandardInviteLiveSendBlocker({
      ...base,
      sendMode: "LIVE_ALLOWED",
      contributorRoleProvisioned: false,
    });
    expect(blocker).toContain("Vereinsleitung (Pilot)");
  });
});