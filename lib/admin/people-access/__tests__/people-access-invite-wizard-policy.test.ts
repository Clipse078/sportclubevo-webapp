import { describe, expect, it } from "vitest";
import {
  resolvePeopleAccessInviteLiveSendBlocker,
  resolvePeopleAccessInvitePrepareBlocker,
} from "@/lib/admin/people-access/people-access-invite-wizard-policy";

describe("people-access invite wizard policy", () => {
  const base = {
    canInvite: true,
    email: "a@example.com",
    firstName: "Alex",
    lastName: "Example",
    selectedRoleIds: ["role-1"],
    sendMode: "DRY_RUN" as const,
  };

  it("prepare passes with complete payload", () => {
    expect(resolvePeopleAccessInvitePrepareBlocker(base)).toBeNull();
  });

  it("prepare blocks without roles", () => {
    expect(
      resolvePeopleAccessInvitePrepareBlocker({ ...base, selectedRoleIds: [] }),
    ).toMatch(/Rolle/);
  });

  it("live send blocked when policy is DRY_RUN", () => {
    expect(resolvePeopleAccessInviteLiveSendBlocker(base)).toMatch(/nicht freigeschaltet/);
  });

  it("live send allowed when policy is LIVE_ALLOWED", () => {
    expect(
      resolvePeopleAccessInviteLiveSendBlocker({ ...base, sendMode: "LIVE_ALLOWED" }),
    ).toBeNull();
  });

  it("surfaces policy load errors instead of pretending live is disabled", () => {
    expect(
      resolvePeopleAccessInviteLiveSendBlocker({
        ...base,
        sendMode: null,
        sendPolicyLoadError: "Netzwerkfehler beim Laden der Versandfreigabe.",
      }),
    ).toBe("Netzwerkfehler beim Laden der Versandfreigabe.");
  });

  it("blocks live send while policy is loading", () => {
    expect(
      resolvePeopleAccessInviteLiveSendBlocker({ ...base, sendMode: null }),
    ).toMatch(/wird geladen/);
  });
});