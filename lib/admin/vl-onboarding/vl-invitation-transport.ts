/**
 * VL invitation delivery transport — mock (default) and live mail adapter.
 */

import { sendMail } from "@/lib/email/mailer";
import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";

export type VlInvitationTransportPayload = {
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
};

export type VlInvitationTransportResult = {
  queued: boolean;
  mode: VlInvitationSendMode | "LIVE";
  recipientEmail: string;
  subject: string;
  duplicateSuppressed?: boolean;
};

export type VlInvitationTransport = {
  mode: VlInvitationSendMode | "LIVE";
  deliver(payload: VlInvitationTransportPayload): Promise<VlInvitationTransportResult>;
};

/** In-memory fixture transport — never delivers mail; dedupes by recipient in a batch. */
export function createMockVlInvitationTransport(): VlInvitationTransport & {
  deliveries: VlInvitationTransportPayload[];
} {
  const deliveries: VlInvitationTransportPayload[] = [];
  const seen = new Set<string>();

  return {
    mode: "DRY_RUN",
    deliveries,
    async deliver(payload) {
      const key = payload.recipientEmail.toLowerCase();
      if (seen.has(key)) {
        return {
          queued: false,
          mode: "DRY_RUN",
          recipientEmail: payload.recipientEmail,
          subject: payload.subject,
          duplicateSuppressed: true,
        };
      }
      seen.add(key);
      deliveries.push(payload);
      return {
        queued: false,
        mode: "DRY_RUN",
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
      };
    },
  };
}

export function createLiveVlInvitationTransport(): VlInvitationTransport {
  return {
    mode: "LIVE_ALLOWED",
    async deliver(payload) {
      await sendMail({
        to: payload.recipientEmail,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      return {
        queued: true,
        mode: "LIVE",
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
      };
    },
  };
}