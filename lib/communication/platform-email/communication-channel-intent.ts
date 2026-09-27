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

export function resolveCommunicationChannelIntent(input: {
  orchestrationMetaJson: unknown;
}): CommunicationChannelIntent {
  const parsed = parseCampaignOrchestrationMeta(input.orchestrationMetaJson);
  if (parsed) return channelIntentFromCampaignOrchestration(parsed);
  return defaultCommunicationChannelIntent();
}
