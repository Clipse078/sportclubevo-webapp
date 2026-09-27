/**
 * SCE-COMM-13 — combine COMM-03 internal snapshots with sponsor external snapshots for publish.
 */

import { buildDispatchRecipientSnapshots } from "@/lib/communication/platform/recipient-resolution/snapshot-builder";
import type { RecipientSnapshotRow } from "@/lib/communication/platform/recipient-resolution/pipeline";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { collectSponsorExternalSnapshotRows } from "@/lib/communication/sponsor/sponsor-external-recipient-snapshots";

export async function buildCampaignPublishSnapshotCreateMany(input: {
  tenantId: string;
  communicationId: string;
  audience: CommunicationAudienceSpec;
  audienceFingerprint: string;
  resolvedAt: string;
  deliveryTargets: RecipientSnapshotRow[];
}) {
  const internalRows = buildDispatchRecipientSnapshots({
    communicationDispatchRef: input.communicationId,
    tenantId: input.tenantId,
    audienceFingerprint: input.audienceFingerprint,
    channel: "IN_APP",
    resolvedAt: input.resolvedAt,
    deliveryTargets: input.deliveryTargets,
  });

  const externalRows = await collectSponsorExternalSnapshotRows({
    tenantId: input.tenantId,
    audience: input.audience,
    audienceFingerprint: input.audienceFingerprint,
    channel: "IN_APP",
    resolvedAt: input.resolvedAt,
  });

  return {
    internalCount: internalRows.length,
    externalCount: externalRows.length,
    totalCount: internalRows.length + externalRows.length,
    deliveryUserIds: internalRows.map((s) => s.deliveryUserId).filter(Boolean),
    createManyData: [
      ...internalRows.map((snap) => ({
        tenantId: input.tenantId,
        communicationId: input.communicationId,
        recipientKind: "INTERNAL_IN_APP" as const,
        subjectPersonId: snap.subjectPersonId,
        deliveryUserId: snap.deliveryUserId,
        channel: snap.channel,
        audienceFingerprint: snap.audienceFingerprint,
        viaGuardianSubstitution: snap.viaGuardianSubstitution,
        resolvedAt: new Date(snap.resolvedAt),
      })),
      ...externalRows.map((snap) => ({
        tenantId: input.tenantId,
        communicationId: input.communicationId,
        recipientKind: snap.recipientKind,
        sponsorContactId: snap.sponsorContactId,
        subjectPersonId: snap.subjectPersonId,
        deliveryUserId: snap.deliveryUserId,
        channel: snap.channel,
        externalSnapshotJson: snap.externalSnapshotJson,
        audienceFingerprint: input.audienceFingerprint,
        viaGuardianSubstitution: false,
        resolvedAt: new Date(input.resolvedAt),
      })),
    ],
  };
}
