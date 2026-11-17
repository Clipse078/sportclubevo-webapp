/** Administrator-facing copy for the standard People & Access VL invite wizard (no developer jargon). */

import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";

export const VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED =
  "Der Vereinsleitungszugang muss zuerst eingerichtet werden.";

export const VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE = `${VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED} Live-Versand ist bis dahin blockiert.`;

export const VL_STANDARD_INVITE_PREPARE_STATUS_HINT_DRY_RUN =
  "«Einladung vorbereiten» versendet keine E-Mail — dieselbe Verarbeitung wie im VL-Bulk-Workspace, nur ohne Live-Zustellung.";

export const VL_STANDARD_INVITE_PREPARE_STATUS_HINT_LIVE_ALLOWED =
  "«Einladung vorbereiten» versendet keine E-Mail. Live-Versand ist auf dieser Umgebung freigeschaltet; der Versand erfolgt im VL-Bulk-Workspace mit Bestätigung.";

/** @deprecated Use {@link resolveVlStandardInvitePrepareStatusHint} for policy-accurate UI. */
export const VL_STANDARD_INVITE_PREPARE_STATUS_HINT = VL_STANDARD_INVITE_PREPARE_STATUS_HINT_DRY_RUN;

export function resolveVlStandardInvitePrepareStatusHint(
  sendMode: VlInvitationSendMode,
): string {
  return sendMode === "LIVE_ALLOWED"
    ? VL_STANDARD_INVITE_PREPARE_STATUS_HINT_LIVE_ALLOWED
    : VL_STANDARD_INVITE_PREPARE_STATUS_HINT_DRY_RUN;
}

export const VL_STANDARD_INVITE_PREPARE_BUTTON_LABEL = "Einladung vorbereiten";

export const VL_STANDARD_INVITE_SEND_CONTRIBUTOR_ROLE_NOTE = `${VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED} Vorschau und «Einladung vorbereiten» nutzen die Vorlage; Live-Versand bleibt blockiert.`;

export const VL_LIVE_SEND_CONTRIBUTOR_ROLE_BLOCKED = `Live-Versand blockiert — ${VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED}`;