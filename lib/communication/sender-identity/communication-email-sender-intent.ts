/**
 * SCE-COMM-EVO-08 — optional sender identity intent stored in orchestrationMetaJson.
 */

import {
  parseCampaignOrchestrationMeta,
  type CampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";

export function parseEmailSenderIdentityIdFromOrchestration(
  orchestrationMetaJson: unknown,
): string | null {
  if (!orchestrationMetaJson || typeof orchestrationMetaJson !== "object") {
    return null;
  }
  const record = orchestrationMetaJson as Record<string, unknown>;
  const raw = record.emailSenderIdentityId;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function withEmailSenderIdentityInOrchestration(
  orchestrationMetaJson: unknown,
  emailSenderIdentityId: string | null,
): Record<string, unknown> {
  const base =
    orchestrationMetaJson && typeof orchestrationMetaJson === "object"
      ? { ...(orchestrationMetaJson as Record<string, unknown>) }
      : {};
  if (emailSenderIdentityId?.trim()) {
    base.emailSenderIdentityId = emailSenderIdentityId.trim();
  } else {
    delete base.emailSenderIdentityId;
  }
  return base;
}

export function withEmailSenderIdentityInCampaignOrchestration(
  orchestration: CampaignOrchestrationMeta,
  emailSenderIdentityId: string | null,
): CampaignOrchestrationMeta & { emailSenderIdentityId?: string } {
  const next = { ...orchestration } as CampaignOrchestrationMeta & {
    emailSenderIdentityId?: string;
  };
  if (emailSenderIdentityId?.trim()) {
    next.emailSenderIdentityId = emailSenderIdentityId.trim();
  } else {
    delete next.emailSenderIdentityId;
  }
  return next;
}

export function parseEmailSenderIdentityIdFromCampaignOrchestration(
  orchestrationMetaJson: unknown,
): string | null {
  const parsed = parseCampaignOrchestrationMeta(orchestrationMetaJson);
  if (parsed) {
    const fromCampaign = parseEmailSenderIdentityIdFromOrchestration(orchestrationMetaJson);
    if (fromCampaign) return fromCampaign;
  }
  return parseEmailSenderIdentityIdFromOrchestration(orchestrationMetaJson);
}
