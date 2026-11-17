import { describe, expect, it } from "vitest";
import {
  resolveVlInvitationLiveSendBlocker,
  resolveVlInvitationSendUiState,
} from "@/lib/admin/vl-onboarding/vl-invitation-send-ui-policy";

const baseResolved = [{ email: "a@fcallschwil.ch", displayName: "Ada", missingFunction: false }];

describe("vl invitation send ui policy", () => {
  it("uses preview refresh without send endpoint when live send is off", () => {
    const state = resolveVlInvitationSendUiState({
      sendMode: "DRY_RUN",
      canInvite: true,
      contributorRoleProvisioned: true,
      invalidEmailCount: 0,
      resolved: baseResolved,
    });
    expect(state.action).toBe("preview_refresh");
    expect(state.primaryButtonLabel).toBe("Vorschau aktualisieren");
    expect(state.primaryUsesSendEndpoint).toBe(false);
    expect(state.liveSendEnabled).toBe(false);
    expect(state.blockerMessage).toContain("nicht freigeschaltet");
  });

  it("blocks live send when contributor role is missing", () => {
    const blocker = resolveVlInvitationLiveSendBlocker({
      sendMode: "LIVE_ALLOWED",
      canInvite: true,
      contributorRoleProvisioned: false,
      invalidEmailCount: 0,
      resolved: baseResolved,
    });
    expect(blocker).toContain("eingerichtet");
  });

  it("enables live send only when prerequisites are satisfied", () => {
    const state = resolveVlInvitationSendUiState({
      sendMode: "LIVE_ALLOWED",
      canInvite: true,
      contributorRoleProvisioned: true,
      invalidEmailCount: 0,
      resolved: baseResolved,
    });
    expect(state.liveSendEnabled).toBe(true);
    expect(state.blockerMessage).toBeNull();
  });
});