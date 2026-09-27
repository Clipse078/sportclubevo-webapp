/**
 * SCE-COMM-03 / COMM-18 — dispatch-time immutable recipient snapshot builder.
 */

import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import type { RecipientSnapshotRow } from "@/lib/communication/platform/recipient-resolution/pipeline";

export type DispatchRecipientSnapshotInput = {
  communicationDispatchRef: string;
  tenantId: string;
  audienceFingerprint: string;
  channel: CommunicationChannel;
  resolvedAt: string;
  deliveryTargets: RecipientSnapshotRow[];
};

export type DispatchRecipientSnapshotRow = {
  communicationDispatchRef: string;
  subjectPersonId: string;
  deliveryUserId: string;
  channel: CommunicationChannel;
  resolvedAt: string;
  audienceFingerprint: string;
  viaGuardianSubstitution: boolean;
  safeguardingReasonCode: string | null;
  subjectMinorAtDispatch: boolean | null;
  guardianPersonId: string | null;
  resolvedFromAudience: true;
};

/**
 * Builds immutable snapshot rows for communication persistence.
 */
export function buildDispatchRecipientSnapshots(
  input: DispatchRecipientSnapshotInput,
): DispatchRecipientSnapshotRow[] {
  return input.deliveryTargets.map((row) => ({
    communicationDispatchRef: input.communicationDispatchRef,
    subjectPersonId: row.subjectPersonId,
    deliveryUserId: row.deliveryUserId,
    channel: row.channel,
    resolvedAt: input.resolvedAt,
    audienceFingerprint: input.audienceFingerprint,
    viaGuardianSubstitution: row.viaGuardianSubstitution,
    safeguardingReasonCode: row.safeguardingReasonCode ?? null,
    subjectMinorAtDispatch: row.subjectMinorAtDispatch ?? null,
    guardianPersonId: row.guardianPersonId ?? null,
    resolvedFromAudience: true as const,
  }));
}
