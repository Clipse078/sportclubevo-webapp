import {
  defaultCampaignOrchestrationMeta,
  parseCampaignOrchestrationMeta,
  type CampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";

export type CommunicationChannelIntent = {
  inApp: boolean;
  push: boolean;
  email: boolean;
};

export function defaultCommunicationChannelIntent(): CommunicationChannelIntent {
  const defaults = defaultCampaignOrchestrationMeta();
  return {
    inApp: defaults.channels.inApp,
    push: defaults.channels.push,
    email: defaults.channels.email,
  };
}

export function channelIntentFromCampaignOrchestration(
  meta: CampaignOrchestrationMeta,
): CommunicationChannelIntent {
  return {
    inApp: meta.channels.inApp,
    push: meta.channels.push,
    email: meta.channels.email,
  };
}

function parseDirectMessageChannelIntent(
  orchestrationMetaJson: unknown,
): CommunicationChannelIntent | null {
  if (!orchestrationMetaJson || typeof orchestrationMetaJson !== "object") return null;
  const record = orchestrationMetaJson as Record<string, unknown>;
  if (record.directMessage !== true) return null;
  const channelIntent = record.channelIntent;
  if (!channelIntent || typeof channelIntent !== "object") return null;
  const ci = channelIntent as Record<string, unknown>;
  return {
    inApp: ci.inApp !== false,
    push: ci.push !== false,
    email: ci.email === true,
  };
}

export function resolveCommunicationChannelIntent(input: {
  orchestrationMetaJson: unknown;
}): CommunicationChannelIntent {
  const direct = parseDirectMessageChannelIntent(input.orchestrationMetaJson);
  if (direct) return direct;
  const parsed = parseCampaignOrchestrationMeta(input.orchestrationMetaJson);
  if (parsed) return channelIntentFromCampaignOrchestration(parsed);
  return defaultCommunicationChannelIntent();
}
