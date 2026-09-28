/**
 * SCE-COMM-EVO-03 — shared audience preview for composers (COMM-03 resolution).
 */

import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import { prisma } from "@/lib/db/prisma";
import {
  audienceSpecIsDynamicAtDispatch,
  DYNAMIC_AUDIENCE_NOTICE_DE,
} from "@/lib/communication/audience/audience-dynamic-notice";
import { summarizeCommunicationAudienceSelection } from "@/lib/communication/audience/human-audience-summary";
import {
  buildCommunicationAudienceSpec,
  inferCommunicationAudienceSelection,
} from "@/lib/communication/audience/communication-audience-selection";
import { loadCommunicationAudienceLabels } from "@/lib/communication/audience/communication-audience-search-service";

export type CommunicationAudiencePreviewResult = {
  candidates: number;
  excluded: number;
  effective: number;
  scopeNotice: string | null;
  audienceSummary: string;
  dynamicAudienceNotice: string | null;
  guardianDeliveryCount: number | null;
  recipients: { personId: string; displayName: string }[];
  hasMore: boolean;
};

export async function previewCommunicationAudience(input: {
  tenantId: string;
  senderUserId: string;
  audience: CommunicationAudienceSpec;
  context: CommunicationContextRef;
  category: CommunicationPreferenceCategory;
  includeRecipientDetail?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<CommunicationAudiencePreviewResult> {
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
  const pageSize = Math.min(25, Math.max(1, input.pageSize ?? 10));
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

  const selection = inferCommunicationAudienceSelection(input.audience);
  const labels = await loadCommunicationAudienceLabels({
    tenantId: input.tenantId,
    orgUnitIds: selection.orgUnitIds,
    teamIds: selection.teamIds,
    roleIds: selection.roleIds,
    targetGroupIds: selection.targetGroupIds,
    personIds: selection.personIds,
  });

  const guardianDeliveryCount =
    resolution.guardianExpansions.length > 0 ? resolution.guardianExpansions.length : null;

  return {
    candidates: resolution.summary.candidateCount,
    excluded: resolution.summary.excludedCount,
    effective: resolution.summary.effectiveCount,
    scopeNotice: resolution.metadata.senderScopeLimitedPreview
      ? "Empfänger für deinen aktuellen Berechtigungsumfang"
      : null,
    audienceSummary: summarizeCommunicationAudienceSelection({ selection, labels }),
    dynamicAudienceNotice: audienceSpecIsDynamicAtDispatch(input.audience)
      ? DYNAMIC_AUDIENCE_NOTICE_DE
      : null,
    guardianDeliveryCount,
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

export function previewAudienceFromSelection(input: {
  tenantId: string;
  senderUserId: string;
  selection: import("@/lib/communication/audience/communication-audience-selection").CommunicationAudienceSelection;
  context: CommunicationContextRef;
  category: CommunicationPreferenceCategory;
  includeRecipientDetail?: boolean;
}): Promise<CommunicationAudiencePreviewResult> {
  const audience = buildCommunicationAudienceSpec(input.selection);
  return previewCommunicationAudience({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    audience,
    context: input.context,
    category: input.category,
    includeRecipientDetail: input.includeRecipientDetail,
  });
}
