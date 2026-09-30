/**
 * SCE-COMM-03 — authoritative Zielgruppe recipient preview (current-state only).
 */

import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import {
  buildStructuralExclusionFromEditor,
  editorDefinitionToAudienceSpec,
} from "@/lib/communication/zielgruppen/rule-mapper";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { resolveAudienceCandidates } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import { buildZielgruppePreviewProvenance } from "@/lib/communication/zielgruppen/audience-provenance-service";
import { prisma } from "@/lib/db/prisma";

export type ZielgruppeRecipientPreviewRow = {
  kind: "PERSON" | "EXTERNAL";
  personId?: string;
  externalContactId?: string;
  displayName: string;
  email?: string | null;
  includedPaths: Array<{ code: string; label: string }>;
};

export type ZielgruppeRecipientPreviewResult = {
  candidates: number;
  excluded: number;
  effective: number;
  externalCount: number;
  scopeNotice: string | null;
  recipients: ZielgruppeRecipientPreviewRow[];
  hasMore: boolean;
};

async function resolveRoleKeys(tenantId: string, roleIds: string[]): Promise<string[]> {
  if (roleIds.length === 0) return [];
  const roles = await prisma.role.findMany({
    where: { id: { in: roleIds }, tenantId, scope: "TENANT" },
    select: { key: true },
  });
  return roles.map((r) => r.key);
}

export async function previewZielgruppeRecipients(input: {
  definition: ZielgruppeEditorDefinition;
  channel?: CommunicationChannel;
  page?: number;
  pageSize?: number;
}): Promise<ZielgruppeRecipientPreviewResult> {
  const session = await requireAnyPermission([
    PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW,
    PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE,
  ]);
  const tenant = await getActiveTenant();
  if (!tenant) throw new Error("Tenant nicht gefunden.");
  const senderUserId = session.user.effectiveUserId ?? session.user.id;

  const roleKeys = await resolveRoleKeys(tenant.id, input.definition.roleIds);
  const excludeRoleKeys = await resolveRoleKeys(tenant.id, input.definition.excludeRoleIds);
  const audience = editorDefinitionToAudienceSpec(input.definition, roleKeys);
  const structuralExclusion =
    buildStructuralExclusionFromEditor(input.definition, excludeRoleKeys) ?? undefined;

  const [resolution, audienceCandidates] = await Promise.all([
    resolveCommunicationRecipients(
      {
        tenantId: tenant.id,
        senderActor: { userId: senderUserId },
        audience,
        context: { kind: "ORGANISATION", tenantId: tenant.id },
        channel: input.channel ?? "IN_APP",
        category: "CLUB_OPERATIONAL",
        mode: "PREVIEW",
      },
      { structuralExclusionSelectors: structuralExclusion },
    ),
    resolveAudienceCandidates({
      tenantId: tenant.id,
      audience,
      structuralExclusionSelectors: structuralExclusion,
      senderUserId,
    }),
  ]);

  const provenanceRows = await buildZielgruppePreviewProvenance({
    tenantId: tenant.id,
    definition: input.definition,
    roleKeys,
    senderUserId,
    effectivePersonIds: resolution.effectiveRecipientPersonIds,
    externalContactIds: audienceCandidates.candidateExternalContactIds,
  });

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const slice = provenanceRows.slice((page - 1) * pageSize, page * pageSize);

  return {
    candidates: resolution.summary.candidateCount,
    excluded: resolution.summary.excludedCount,
    effective: resolution.summary.effectiveCount,
    externalCount: audienceCandidates.candidateExternalContactIds.length,
    scopeNotice: resolution.metadata.senderScopeLimitedPreview
      ? "Empfänger für deinen aktuellen Berechtigungsumfang"
      : null,
    recipients: slice,
    hasMore: provenanceRows.length > page * pageSize,
  };
}
