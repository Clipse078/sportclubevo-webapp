/**
 * SCE-COMM-12 — campaign channel/scheduling seams (transport-independent).
 */

export const CAMPAIGN_ORCHESTRATION_SCHEMA_VERSION = 1 as const;

export type CampaignChannelIntent = {
  inApp: boolean;
  push: boolean;
  /** SCE-COMM-14 outbound email channel intent. */
  email: boolean;
};

export type CampaignSchedulingIntent = {
  mode: "IMMEDIATE" | "SCHEDULED";
  scheduledAt?: string | null;
  timezone?: string | null;
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
      email: true,
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
  const channels = record.channels;
  if (!channels || typeof channels !== "object") return null;
  const channelRecord = channels as Record<string, unknown>;
  const emailRaw = channelRecord.email;
  const email =
    emailRaw === true ||
    emailRaw === false
      ? emailRaw
      : emailRaw === "NOT_IMPLEMENTED"
        ? false
        : true;
  return {
    schemaVersion: CAMPAIGN_ORCHESTRATION_SCHEMA_VERSION,
    channels: {
      inApp: channelRecord.inApp === true,
      push: channelRecord.push === true,
      email,
    },
    scheduling:
      record.scheduling && typeof record.scheduling === "object"
        ? (record.scheduling as CampaignOrchestrationMeta["scheduling"])
        : { mode: "IMMEDIATE", scheduledAt: null, timezone: null },
  };
}

export function schedulingIntentFromPublicationSchedule(input: {
  scheduledAt: Date;
  timezone: string;
}): CampaignSchedulingIntent {
  return {
    mode: "SCHEDULED",
    scheduledAt: input.scheduledAt.toISOString(),
    timezone: input.timezone,
  };
}
