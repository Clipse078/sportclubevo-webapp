import { logAction } from "@/lib/audit/log-action";
import type { CommunicationPreferenceChangeSource } from "@prisma/client";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";

export async function recordCommunicationPreferenceAudit(input: {
  tenantId: string;
  actorUserId: string | null;
  subjectKind: "USER" | "SPONSOR_CONTACT";
  subjectId: string;
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  previousExplicitState: "ENABLED" | "DISABLED" | null;
  newExplicitState: "ENABLED" | "DISABLED";
  source: CommunicationPreferenceChangeSource;
}): Promise<void> {
  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType:
      input.subjectKind === "USER"
        ? "UserCommunicationPreference"
        : "SponsorContactCommunicationPreference",
    entityId: input.subjectId,
    action: "COMMUNICATION_PREFERENCE_CHANGED",
    afterJson: {
      subjectKind: input.subjectKind,
      category: input.category,
      channel: input.channel,
      previousExplicitState: input.previousExplicitState,
      newExplicitState: input.newExplicitState,
      source: input.source,
    },
  });
}
