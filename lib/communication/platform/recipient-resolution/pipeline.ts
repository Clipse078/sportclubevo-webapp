/**
 * SCE-COMM-01 — dynamic recipient resolution pipeline (dispatch-time).
 *
 * Zielgruppen are rules, not materialised mailing lists. Historical sends MUST
 * persist recipient snapshots — never rely on recomputing past membership.
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import {
  resolveEffectiveRecipients,
  type SenderCommunicationScope,
  type RecipientEligibilityInput,
} from "@/lib/communication/platform/authorization/communication-authorization";

export type AudienceCandidateResolutionPort = {
  resolveAudiencePersonIds(
    tenantId: string,
    audience: CommunicationAudienceSpec,
  ): Promise<string[]>;
};

export type GuardianExpansionPort = {
  /**
   * Maps subject persons to delivery user targets (self, guardians, substitutions).
   * Policy is tenant-configurable (COMM-18).
   */
  expandSubjectsToDeliveryTargets(input: {
    tenantId: string;
    subjectPersonIds: readonly string[];
    category: CommunicationPreferenceCategory;
    channel: CommunicationChannel;
  }): Promise<
    {
      subjectPersonId: string;
      deliveryUserIds: string[];
      viaGuardianSubstitution: boolean;
    }[]
  >;
};

export type RecipientSnapshotRow = {
  subjectPersonId: string;
  deliveryUserId: string;
  channel: CommunicationChannel;
  capturedAt: string;
  viaGuardianSubstitution: boolean;
};

export type RecipientResolutionPipelineInput = {
  tenantId: string;
  audience: CommunicationAudienceSpec;
  senderScope: SenderCommunicationScope;
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  eligibilityForSubject: (personId: string) => RecipientEligibilityInput | null;
};

export type RecipientResolutionPipelineResult = {
  subjectPersonIds: string[];
  skippedSubjects: { personId: string; reason: string }[];
  deliveryTargets: RecipientSnapshotRow[];
};

/**
 * Pure orchestration shape — IO injected via ports in COMM-03 implementation.
 */
export async function runRecipientResolutionPipeline(
  input: RecipientResolutionPipelineInput,
  ports: {
    audience: AudienceCandidateResolutionPort;
    guardians: GuardianExpansionPort;
  },
): Promise<RecipientResolutionPipelineResult> {
  const candidates = await ports.audience.resolveAudiencePersonIds(
    input.tenantId,
    input.audience,
  );

  const { effectiveSubjectPersonIds, skipped } = resolveEffectiveRecipients(
    candidates,
    input.senderScope,
    input.eligibilityForSubject,
  );

  const expanded = await ports.guardians.expandSubjectsToDeliveryTargets({
    tenantId: input.tenantId,
    subjectPersonIds: effectiveSubjectPersonIds,
    category: input.category,
    channel: input.channel,
  });

  const capturedAt = new Date().toISOString();
  const deliveryTargets: RecipientSnapshotRow[] = [];
  for (const row of expanded) {
    for (const deliveryUserId of row.deliveryUserIds) {
      deliveryTargets.push({
        subjectPersonId: row.subjectPersonId,
        deliveryUserId,
        channel: input.channel,
        capturedAt,
        viaGuardianSubstitution: row.viaGuardianSubstitution,
      });
    }
  }

  return {
    subjectPersonIds: effectiveSubjectPersonIds,
    skippedSubjects: skipped,
    deliveryTargets,
  };
}
