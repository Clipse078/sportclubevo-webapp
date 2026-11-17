import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-mode";
import {
  resolveVlStandardInviteLiveSendBlocker,
  resolveVlStandardInviteWizardBlocker,
  type VlStandardInviteWizardInput,
} from "@/lib/admin/vl-onboarding/vl-standard-invite-wizard-policy";

export type PeopleAccessInviteWizardInput = {
  canInvite: boolean;
  email: string;
  firstName: string;
  lastName: string;
  selectedRoleIds: string[];
  sendMode: VlInvitationSendMode | null;
  sendPolicyLoadError?: string | null;
  contributorRoleProvisioned?: boolean | null;
};

export function resolvePeopleAccessInvitePrepareBlocker(
  input: PeopleAccessInviteWizardInput,
): string | null {
  if (!input.canInvite) {
    return "Keine Berechtigung zum Einladen.";
  }
  if (!input.email.trim() || !input.firstName.trim() || !input.lastName.trim()) {
    return "Person vollständig erfassen.";
  }
  if (input.selectedRoleIds.length === 0) {
    return "Mindestens eine Rolle auswählen.";
  }
  return null;
}

export function resolvePeopleAccessInviteLiveSendBlocker(
  input: PeopleAccessInviteWizardInput,
): string | null {
  const prepareBlocker = resolvePeopleAccessInvitePrepareBlocker(input);
  if (prepareBlocker) return prepareBlocker;
  if (input.sendPolicyLoadError) {
    return input.sendPolicyLoadError;
  }
  if (input.sendMode === null) {
    return "Versandfreigabe wird geladen…";
  }
  if (input.sendMode !== "LIVE_ALLOWED") {
    return "Live-Versand ist auf dieser Umgebung nicht freigeschaltet.";
  }
  return null;
}

/** VL shortcut uses the same live-send gate shape as bulk (contributor role provisioned). */
export function resolveVlShortcutLiveSendBlocker(
  input: VlStandardInviteWizardInput,
): string | null {
  return resolveVlStandardInviteLiveSendBlocker(input);
}

export function resolveVlShortcutPrepareBlocker(
  input: VlStandardInviteWizardInput,
): string | null {
  return resolveVlStandardInviteWizardBlocker(input);
}