/**
 * Guards live VL invitation sends — default is dry-run / mock transport only.
 */

import "server-only";

import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-mode";

export type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-mode";

export const VL_INVITATION_LIVE_SEND_ENV = "VL_INVITATION_LIVE_SEND";

export function resolveVlInvitationSendMode(): VlInvitationSendMode {
  if (process.env[VL_INVITATION_LIVE_SEND_ENV] === "true") {
    return "LIVE_ALLOWED";
  }
  return "DRY_RUN";
}

export function assertVlInvitationSendAllowed(explicitConfirm?: boolean): {
  ok: boolean;
  mode: VlInvitationSendMode;
  error?: string;
} {
  const mode = resolveVlInvitationSendMode();
  if (mode === "LIVE_ALLOWED" && explicitConfirm === true) {
    return { ok: true, mode };
  }
  if (mode === "LIVE_ALLOWED" && explicitConfirm !== true) {
    return {
      ok: false,
      mode: "LIVE_BLOCKED",
      error:
        "Live-Versand erfordert explizite Bestätigung in der Anfrage (confirmLiveSend: true).",
    };
  }
  return {
    ok: false,
    mode: "DRY_RUN",
    error:
      "Live-Versand ist deaktiviert — es wurden keine Einladungen erzeugt und keine E-Mails versendet.",
  };
}

export type MockInvitationTransportResult = {
  queued: false;
  mode: "DRY_RUN";
  recipientEmail: string;
  subject: string;
};

/** Isolated fixture transport — never delivers mail. */
export function mockInvitationTransport(input: {
  recipientEmail: string;
  subject: string;
}): MockInvitationTransportResult {
  return {
    queued: false,
    mode: "DRY_RUN",
    recipientEmail: input.recipientEmail,
    subject: input.subject,
  };
}