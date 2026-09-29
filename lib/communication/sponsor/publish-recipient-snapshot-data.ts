/**
 * SCE-COMM-13 — combine COMM-03 internal snapshots with sponsor external snapshots for publish.
 */

import { buildDispatchRecipientSnapshots } from "@/lib/communication/platform/recipient-resolution/snapshot-builder";
import type { RecipientSnapshotRow } from "@/lib/communication/platform/recipient-resolution/pipeline";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { collectSponsorExternalSnapshotRows } from "@/lib/communication/sponsor/sponsor-external-recipient-snapshots";
import { collectCommunicationExternalSnapshotRows } from "@/lib/communication/platform/recipient-resolution/communication-external-recipient-snapshots";
import type { Prisma } from "@prisma/client";
import type { PersonalisedSnapshotExtras } from "@/lib/communication/personalisation/publish-personalisation";

function snapshotKey(row: {
  subjectPersonId: string;
  deliveryUserId: string;
  channel: string;
}): string {
  return `${row.subjectPersonId}:${row.deliveryUserId}:${row.channel}`;
}

export async function buildCampaignPublishSnapshotCreateMany(input: {
  tenantId: string;
  communicationId: string;
  audience: CommunicationAudienceSpec;
  audienceFingerprint: string;
  resolvedAt: string;
  deliveryTargets: RecipientSnapshotRow[];
  emailChannelEnabled: boolean;
  emailTransportReady: boolean;
  personalisationByTarget?: Map<string, PersonalisedSnapshotExtras>;
  structuralExclusionSelectors?: import("@/lib/communication/platform/audience/structural-targets").StructuralAudienceSelectors;
}) {
  const internalRows = buildDispatchRecipientSnapshots({
    communicationDispatchRef: input.communicationId,
    tenantId: input.tenantId,
    audienceFingerprint: input.audienceFingerprint,
    channel: "IN_APP",
    resolvedAt: input.resolvedAt,
    deliveryTargets: input.deliveryTargets,
  });

  const sponsorExternalRows = await collectSponsorExternalSnapshotRows({
    tenantId: input.tenantId,
    audience: input.audience,
    audienceFingerprint: input.audienceFingerprint,
    channel: "IN_APP",
    resolvedAt: input.resolvedAt,
    emailChannelEnabled: input.emailChannelEnabled,
    emailTransportReady: input.emailTransportReady,
  });

  const communicationExternalRows = await collectCommunicationExternalSnapshotRows({
    tenantId: input.tenantId,
    audience: input.audience,
    channel: "IN_APP",
    emailChannelEnabled: input.emailChannelEnabled,
    emailTransportReady: input.emailTransportReady,
    structuralExclusionSelectors: input.structuralExclusionSelectors,
  });

  const externalRows = [...sponsorExternalRows, ...communicationExternalRows];

  return {
    internalCount: internalRows.length,
    externalCount: externalRows.length,
    totalCount: internalRows.length + externalRows.length,
    deliveryUserIds: internalRows.map((s) => s.deliveryUserId).filter(Boolean),
    createManyData: [
      ...internalRows.map((snap) => {
        const personalisation = input.personalisationByTarget?.get(
          snapshotKey({
            subjectPersonId: snap.subjectPersonId,
            deliveryUserId: snap.deliveryUserId,
            channel: snap.channel,
          }),
        );
        return {
          tenantId: input.tenantId,
          communicationId: input.communicationId,
          recipientKind: "INTERNAL_IN_APP" as const,
          subjectPersonId: snap.subjectPersonId,
          deliveryUserId: snap.deliveryUserId,
          channel: snap.channel,
          audienceFingerprint: snap.audienceFingerprint,
          viaGuardianSubstitution: snap.viaGuardianSubstitution,
          safeguardingReasonCode: snap.safeguardingReasonCode,
          subjectMinorAtDispatch: snap.subjectMinorAtDispatch,
          guardianPersonId: snap.guardianPersonId,
          resolvedAt: new Date(snap.resolvedAt),
          renderedSubject: personalisation?.renderedSubject ?? null,
          renderedBodyText: personalisation?.renderedBodyText ?? null,
          renderedBodyHtml: personalisation?.renderedBodyHtml ?? null,
          personalisationDiagnosticsJson: personalisation?.personalisationDiagnosticsJson
            ? (personalisation.personalisationDiagnosticsJson as Prisma.InputJsonValue)
            : undefined,
        };
      }),
      ...externalRows.map((snap) => ({
        tenantId: input.tenantId,
        communicationId: input.communicationId,
        recipientKind: snap.recipientKind,
        sponsorContactId: "sponsorContactId" in snap ? snap.sponsorContactId : null,
        communicationExternalContactId:
          "communicationExternalContactId" in snap ? snap.communicationExternalContactId : null,
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
