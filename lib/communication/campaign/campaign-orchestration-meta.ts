/**
 * SCE-COMM-12 — campaign channel/scheduling seams (transport-independent).
 */

export const CAMPAIGN_ORCHESTRATION_SCHEMA_VERSION = 1 as const;

export type CampaignChannelIntent = {
  inApp: true;
  push: true;
  /** COMM-13 owns outbound email delivery. */
  email: "NOT_IMPLEMENTED";
};

export type CampaignSchedulingIntent = {
  /** COMM-16 owns reusable scheduling infrastructure. */
  mode: "IMMEDIATE" | "SCHEDULED_NOT_IMPLEMENTED";
  scheduledAt?: string | null;
};

export type CampaignOrchestrationMeta = {
  schemaVersion: typeof CAMPAIGN_ORCHESTRATION_SCHEMA_VERSION;
  channels: CampaignChannelIntent;
  scheduling: CampaignSchedulingIntent;
};

export function defaultCampaignOrchestrationMeta(): CampaignOrchestrationMeta {
  return {
    schemaVersion: CAMPAIGN_ORCHESTRATION_SCHEMA_VERSION,
    channels: {
      inApp: true,
      push: true,
      email: "NOT_IMPLEMENTED",
    },
    scheduling: {
      mode: "IMMEDIATE",
      scheduledAt: null,
    },
  };
}

export function parseCampaignOrchestrationMeta(
  value: unknown,
): CampaignOrchestrationMeta | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== CAMPAIGN_ORCHESTRATION_SCHEMA_VERSION) return null;
  return value as CampaignOrchestrationMeta;
}
