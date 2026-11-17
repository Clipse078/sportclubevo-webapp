import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";

export type VlInvitationSendUiRecipient = {
  displayName?: string;
  missingFunction?: boolean;
};

export type VlInvitationSendUiInput = {
  sendMode: VlInvitationSendMode;
  canInvite: boolean;
  contributorRoleProvisioned: boolean | null;
  invalidEmailCount: number;
  resolved: readonly VlInvitationSendUiRecipient[];
};

export type VlInvitationSendUiAction =
  | "preview_refresh"
  | "live_send"
  | "live_send_blocked";

export type VlInvitationSendUiState = {
  action: VlInvitationSendUiAction;
  primaryButtonLabel: string;
  primaryButtonEnabled: boolean;
  /** True only when the primary control may call POST /api/admin/vl-invitations/send. */
  primaryUsesSendEndpoint: boolean;
  liveSendVisible: boolean;
  liveSendEnabled: boolean;
  blockerMessage: string | null;
  previewStatusHint: string | null;
};

function missingDisplayNameCount(resolved: readonly VlInvitationSendUiRecipient[]): number {
  return resolved.filter((row) => !row.displayName?.trim()).length;
}

function missingFunctionCount(resolved: readonly VlInvitationSendUiRecipient[]): number {
  return resolved.filter((row) => row.missingFunction).length;
}

export function resolveVlInvitationLiveSendBlocker(
  input: VlInvitationSendUiInput,
): string | null {
  if (input.sendMode !== "LIVE_ALLOWED") {
    return "Live-Versand ist nicht freigeschaltet.";
  }
  if (!input.canInvite) {
    return "Keine Berechtigung zum Einladen.";
  }
  if (input.contributorRoleProvisioned === false) {
    return "Die Mandanten-Rolle «Vereinsleitung (Pilot)» fehlt — Rollen-Sync zuerst abschließen.";
  }
  if (input.invalidEmailCount > 0) {
    return "Ungültige oder doppelte E-Mail-Zeilen beheben.";
  }
  if (input.resolved.length === 0) {
    return "Zuerst «Vorschau prüfen» ausführen.";
  }
  const openNames = missingDisplayNameCount(input.resolved);
  if (openNames > 0) {
    return openNames === 1
      ? "Anzeigename für einen Empfänger ergänzen."
      : `Anzeigenamen für ${openNames} Empfänger ergänzen.`;
  }
  const openFunctions = missingFunctionCount(input.resolved);
  if (openFunctions > 0) {
    return openFunctions === 1
      ? "Organisationsfunktion für einen Empfänger bestätigen."
      : `Organisationsfunktionen für ${openFunctions} Empfänger bestätigen.`;
  }
  return null;
}

export function resolveVlInvitationSendUiState(
  input: VlInvitationSendUiInput,
): VlInvitationSendUiState {
  const liveBlocker = resolveVlInvitationLiveSendBlocker(input);
  const previewEnabled = input.canInvite;

  if (input.sendMode !== "LIVE_ALLOWED") {
    return {
      action: "preview_refresh",
      primaryButtonLabel: "Vorschau aktualisieren",
      primaryButtonEnabled: previewEnabled,
      primaryUsesSendEndpoint: false,
      liveSendVisible: true,
      liveSendEnabled: false,
      blockerMessage: liveBlocker,
      previewStatusHint:
        "Es werden keine Einladungen erzeugt und keine E-Mails versendet — nur Empfänger und E-Mail-Vorschau werden aktualisiert.",
    };
  }

  if (liveBlocker) {
    return {
      action: "live_send_blocked",
      primaryButtonLabel: "Vorschau aktualisieren",
      primaryButtonEnabled: previewEnabled,
      primaryUsesSendEndpoint: false,
      liveSendVisible: true,
      liveSendEnabled: false,
      blockerMessage: liveBlocker,
      previewStatusHint: null,
    };
  }

  return {
    action: "live_send",
    primaryButtonLabel: "Vorschau aktualisieren",
    primaryButtonEnabled: previewEnabled,
    primaryUsesSendEndpoint: false,
    liveSendVisible: true,
    liveSendEnabled: true,
    blockerMessage: null,
    previewStatusHint: null,
  };
}