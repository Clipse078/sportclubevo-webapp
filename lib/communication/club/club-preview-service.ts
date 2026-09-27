/**
 * SCE-COMM-11 — canonical club audience preview (COMM-03 counts; privacy-aware detail).
 */

import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import { prisma } from "@/lib/db/prisma";
import { summarizeClubAudienceSpec } from "@/lib/communication/club/club-audience-summary";

export type ClubAudiencePreviewResult = {
  candidates: number;
  excluded: number;
  effective: number;
  scopeNotice: string | null;
  audienceSummary: string;
  recipients: { personId: string; displayName: string }[];
  hasMore: boolean;
};

export async function previewClubCommunicationAudience(input: {
  tenantId: string;
  senderUserId: string;
  audience: CommunicationAudienceSpec;
  context: CommunicationContextRef;
  category: CommunicationPreferenceCategory;
  includeRecipientDetail?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ClubAudiencePreviewResult> {
  const resolution = await resolveCommunicationRecipients({
    tenantId: input.tenantId,
    senderActor: { userId: input.senderUserId },
    audience: input.audience,
    context: input.context,
    channel: "IN_APP",
    category: input.category,
    mode: "PREVIEW",
  });

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const includeDetail = input.includeRecipientDetail === true;
  const slice = includeDetail
    ? resolution.effectiveRecipientPersonIds.slice((page - 1) * pageSize, page * pageSize)
    : [];

  const personRows =
    slice.length > 0
      ? await prisma.person.findMany({
          where: { tenantId: input.tenantId, id: { in: slice } },
          select: { id: true, firstName: true, lastName: true, displayName: true },
        })
      : [];

  const nameById = new Map(
    personRows.map((p) => [
      p.id,
      p.displayName?.trim() || `${p.firstName} ${p.lastName}`.trim(),
    ]),
  );

  return {
    candidates: resolution.summary.candidateCount,
    excluded: resolution.summary.excludedCount,
    effective: resolution.summary.effectiveCount,
    scopeNotice: resolution.metadata.senderScopeLimitedPreview
      ? "Empfänger für deinen aktuellen Berechtigungsumfang"
      : null,
    audienceSummary: summarizeClubAudienceSpec(input.audience),
    recipients: includeDetail
      ? slice.map((personId) => ({
          personId,
          displayName: nameById.get(personId) ?? personId,
        }))
      : [],
    hasMore: includeDetail
      ? resolution.effectiveRecipientPersonIds.length > page * pageSize
      : false,
  };
}
