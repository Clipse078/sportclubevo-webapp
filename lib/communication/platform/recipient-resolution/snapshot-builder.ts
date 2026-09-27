/**
 * SCE-COMM-03 — dispatch-time immutable recipient snapshot builder (persistence deferred).
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
  resolvedFromAudience: true;
};

/**
 * Builds immutable snapshot rows for future communication persistence.
 * Does not write to the database in COMM-03.
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
    resolvedFromAudience: true as const,
  }));
}
