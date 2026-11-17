import type { VlInvitationResolvedRow } from "@/lib/admin/vl-onboarding/resolve-vl-invitation-rows";
import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import {
  resolveVlInvitationLiveSendBlocker,
  type VlInvitationSendUiInput,
} from "@/lib/admin/vl-onboarding/vl-invitation-send-ui-policy";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";
import { isValidVlOrgFunctionKey } from "@/lib/admin/vl-onboarding/vl-org-function-options";

export type VlStandardInviteWizardInput = {
  sendMode: VlInvitationSendMode;
  canInvite: boolean;
  contributorRoleProvisioned: boolean | null;
  email: string;
  firstName: string;
  lastName: string;
  functionKey: string;
  resolved: VlInvitationResolvedRow | null;
};

function resolveVlStandardInviteFormBlocker(input: VlStandardInviteWizardInput): string | null {
  if (!input.canInvite) {
    return "Keine Berechtigung zum Einladen.";
  }
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return "Vor- und Nachname sind erforderlich.";
  }
  if (!validateInvitationEmailSyntax(input.email).ok) {
    return "Gültige E-Mail-Adresse erforderlich.";
  }
  if (!isValidVlOrgFunctionKey(input.functionKey)) {
    return "Organisationsfunktion im Verein auswählen.";
  }
  if (!input.resolved) {
    return "Zugriff wird noch aufgelöst…";
  }
  if (input.resolved.action === "MASKED") {
    return "Empfänger konnte diesem Mandanten nicht zugeordnet werden.";
  }
  if (input.resolved.action === "EXISTING_ACCESS") {
    return "VL-Zugang ist bereits vollständig eingerichtet — keine Einladung nötig.";
  }
  if (input.resolved.action === "INVALID") {
    return "E-Mail konnte nicht verarbeitet werden.";
  }
  return null;
}

/** Dry-run / Vorschau send in the standard wizard (no live delivery). */
export function resolveVlStandardInviteWizardBlocker(
  input: VlStandardInviteWizardInput,
): string | null {
  return resolveVlStandardInviteFormBlocker(input);
}

/** Live send gate — mirrors bulk VL workspace policy. */
export function resolveVlStandardInviteLiveSendBlocker(
  input: VlStandardInviteWizardInput,
): string | null {
  const formBlocker = resolveVlStandardInviteFormBlocker(input);
  if (formBlocker) return formBlocker;

  const recipient: VlInvitationSendUiInput = {
    sendMode: input.sendMode,
    canInvite: input.canInvite,
    contributorRoleProvisioned: input.contributorRoleProvisioned,
    invalidEmailCount: 0,
    resolved: [
      {
        displayName: `${input.firstName} ${input.lastName}`.trim(),
        missingFunction: false,
      },
    ],
  };

  return resolveVlInvitationLiveSendBlocker(recipient);
}

export function vlStandardInviteSendUsesOrchestrator(): true {
  return true;
}