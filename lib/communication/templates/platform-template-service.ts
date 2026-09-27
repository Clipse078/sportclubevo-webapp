/**
 * SCE-COMM-16 — tenant-scoped platform communication templates.
 */

import { Prisma, type PlatformCommunicationTemplateStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import {
  assertTenantOwnedStructuralSelectors,
  assertTenantOwnedTargetGroupIds,
} from "@/lib/communication/club/club-audience-spec";
import { assertTenantOwnedSponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-ownership";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";
import { createCampaignDraft } from "@/lib/communication/campaign/campaign-service";
import { createClubCommunicationDraft } from "@/lib/communication/club/club-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  defaultCampaignOrchestrationMeta,
  parseCampaignOrchestrationMeta,
  type CampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";
import {
  isPlatformCommunicationTemplateKind,
  type PlatformCommunicationTemplateKind,
} from "@/lib/communication/templates/platform-template-constants";
import { recordPlatformTemplateAudit } from "@/lib/communication/templates/platform-template-audit";

export type PlatformTemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  kind: PlatformCommunicationTemplateKind;
  status: PlatformCommunicationTemplateStatus;
  subject: string | null;
  updatedAt: string;
};

function sanitizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new TeamCommunicationValidationError("template name is required");
  if (trimmed.length > 160) {
    throw new TeamCommunicationValidationError("template name exceeds maximum length");
  }
  return trimmed;
}

function sanitizeBody(body: string): string {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) throw new TeamCommunicationValidationError("body is required");
  if (trimmed.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new TeamCommunicationValidationError("body exceeds maximum length");
  }
  return trimmed;
}

async function validateOptionalAudience(
  tenantId: string,
  audience: CommunicationAudienceSpec | null | undefined,
): Promise<void> {
  if (!audience) return;
  const err = validateCommunicationAudienceSpec(audience);
  if (err) throw new TeamCommunicationValidationError(err);
  for (const component of audience.components) {
    if (component.savedTargetGroupIds?.length) {
      await assertTenantOwnedTargetGroupIds({
        tenantId,
        targetGroupIds: component.savedTargetGroupIds,
      });
    }
    if (component.structural) {
      await assertTenantOwnedStructuralSelectors({ tenantId, selectors: component.structural });
    }
    if (component.sponsor && !sponsorSelectorsAreEmpty(component.sponsor)) {
      await assertTenantOwnedSponsorAudienceSelectors({ tenantId, selectors: component.sponsor });
    }
  }
}

async function loadTemplateRow(input: { tenantId: string; templateId: string }) {
  const row = await prisma.platformCommunicationTemplate.findFirst({
    where: { id: input.templateId, tenantId: input.tenantId },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  return row;
}

export async function listPlatformCommunicationTemplates(input: {
  tenantId: string;
  status?: PlatformCommunicationTemplateStatus;
  kind?: string;
}): Promise<PlatformTemplateListItem[]> {
  const rows = await prisma.platformCommunicationTemplate.findMany({
    where: {
      tenantId: input.tenantId,
      ...(input.status ? { status: input.status } : { status: { not: "ARCHIVED" } }),
      ...(input.kind && isPlatformCommunicationTemplateKind(input.kind)
        ? { kind: input.kind }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind as PlatformCommunicationTemplateKind,
    status: row.status,
    subject: row.subject,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getPlatformCommunicationTemplate(input: {
  tenantId: string;
  templateId: string;
}) {
  const row = await loadTemplateRow(input);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind as PlatformCommunicationTemplateKind,
    status: row.status,
    internalName: row.internalName,
    subject: row.subject,
    bodyText: row.bodyText,
    audienceSpec: (row.audienceSpecJson ?? null) as CommunicationAudienceSpec | null,
    orchestration:
      parseCampaignOrchestrationMeta(row.orchestrationMetaJson) ?? defaultCampaignOrchestrationMeta(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createPlatformCommunicationTemplate(input: {
  tenantId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
  kind: string;
  internalName?: string | null;
  subject?: string | null;
  bodyText: string;
  audienceSpec?: CommunicationAudienceSpec | null;
  orchestration?: CampaignOrchestrationMeta;
  status?: PlatformCommunicationTemplateStatus;
}): Promise<{ id: string }> {
  if (!isPlatformCommunicationTemplateKind(input.kind)) {
    throw new TeamCommunicationValidationError("unsupported template kind");
  }
  await validateOptionalAudience(input.tenantId, input.audienceSpec ?? null);

  const created = await prisma.platformCommunicationTemplate.create({
    data: {
      tenantId: input.tenantId,
      name: sanitizeName(input.name),
      description: input.description?.trim() || null,
      kind: input.kind,
      status: input.status ?? "DRAFT",
      internalName: input.internalName?.trim() || null,
      subject: input.subject?.trim() || null,
      bodyText: sanitizeBody(input.bodyText),
      audienceSpecJson: input.audienceSpec
        ? (input.audienceSpec as unknown as Prisma.InputJsonValue)
        : undefined,
      orchestrationMetaJson: (input.orchestration ?? defaultCampaignOrchestrationMeta()) as unknown as Prisma.InputJsonValue,
      createdByUserId: input.actorUserId,
    },
    select: { id: true },
  });

  await recordPlatformTemplateAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    templateId: created.id,
    action: "PLATFORM_COMMUNICATION_TEMPLATE_CREATED",
    metadata: { kind: input.kind },
  });

  return { id: created.id };
}

export async function updatePlatformCommunicationTemplate(input: {
  tenantId: string;
  templateId: string;
  actorUserId: string;
  name?: string;
  description?: string | null;
  internalName?: string | null;
  subject?: string | null;
  bodyText?: string;
  audienceSpec?: CommunicationAudienceSpec | null;
  orchestration?: CampaignOrchestrationMeta;
  status?: PlatformCommunicationTemplateStatus;
}): Promise<{ id: string }> {
  const row = await loadTemplateRow(input);
  if (row.status === "ARCHIVED") {
    throw new TeamCommunicationValidationError("archived templates cannot be edited");
  }

  const data: Prisma.PlatformCommunicationTemplateUpdateInput = {};
  if (input.name !== undefined) data.name = sanitizeName(input.name);
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.internalName !== undefined) data.internalName = input.internalName?.trim() || null;
  if (input.subject !== undefined) data.subject = input.subject?.trim() || null;
  if (input.bodyText !== undefined) data.bodyText = sanitizeBody(input.bodyText);
  if (input.status !== undefined) data.status = input.status;
  if (input.audienceSpec !== undefined) {
    await validateOptionalAudience(input.tenantId, input.audienceSpec);
    data.audienceSpecJson = input.audienceSpec
      ? (input.audienceSpec as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull;
  }
  if (input.orchestration) {
    data.orchestrationMetaJson = input.orchestration as unknown as Prisma.InputJsonValue;
  }

  await prisma.platformCommunicationTemplate.update({ where: { id: row.id }, data });

  await recordPlatformTemplateAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    templateId: row.id,
    action: "PLATFORM_COMMUNICATION_TEMPLATE_UPDATED",
  });

  return { id: row.id };
}

export async function duplicatePlatformCommunicationTemplate(input: {
  tenantId: string;
  templateId: string;
  actorUserId: string;
  name?: string;
}): Promise<{ id: string }> {
  const row = await loadTemplateRow(input);
  const created = await createPlatformCommunicationTemplate({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    name: input.name?.trim() || `${row.name} (Kopie)`,
    description: row.description,
    kind: row.kind,
    internalName: row.internalName,
    subject: row.subject,
    bodyText: row.bodyText,
    audienceSpec: (row.audienceSpecJson ?? null) as CommunicationAudienceSpec | null,
    orchestration:
      parseCampaignOrchestrationMeta(row.orchestrationMetaJson) ?? defaultCampaignOrchestrationMeta(),
    status: "DRAFT",
  });

  await recordPlatformTemplateAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    templateId: created.id,
    action: "PLATFORM_COMMUNICATION_TEMPLATE_DUPLICATED",
    metadata: { sourceTemplateId: row.id },
  });

  return created;
}

export async function archivePlatformCommunicationTemplate(input: {
  tenantId: string;
  templateId: string;
  actorUserId: string;
}): Promise<void> {
  const row = await loadTemplateRow(input);
  if (row.status === "ARCHIVED") return;

  await prisma.platformCommunicationTemplate.update({
    where: { id: row.id },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });

  await recordPlatformTemplateAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    templateId: row.id,
    action: "PLATFORM_COMMUNICATION_TEMPLATE_ARCHIVED",
  });
}

export async function createDraftFromPlatformTemplate(input: {
  tenantId: string;
  templateId: string;
  actorUserId: string;
}): Promise<{ id: string; kind: PlatformCommunicationTemplateKind; redirectPath: string }> {
  const row = await loadTemplateRow({ tenantId: input.tenantId, templateId: input.templateId });
  if (row.status !== "ACTIVE" && row.status !== "DRAFT") {
    throw new TeamCommunicationValidationError("template is not available for use");
  }
  if (!isPlatformCommunicationTemplateKind(row.kind)) {
    throw new TeamCommunicationValidationError("unsupported template kind");
  }

  const audience =
    (row.audienceSpecJson as CommunicationAudienceSpec | null) ??
    ({
      composition: "UNION",
      components: [{ structural: { wholeOrganisation: true } }],
    } satisfies CommunicationAudienceSpec);

  const orchestration =
    parseCampaignOrchestrationMeta(row.orchestrationMetaJson) ?? defaultCampaignOrchestrationMeta();

  let draftId: string;

  if (row.kind === "CAMPAIGN") {
    const draft = await createCampaignDraft({
      tenantId: input.tenantId,
      senderUserId: input.actorUserId,
      internalName: row.internalName?.trim() || row.name,
      subject: row.subject,
      bodyText: row.bodyText,
      audienceSpec: audience,
    });
    draftId = draft.id;
    await prisma.platformCommunication.update({
      where: { id: draftId },
      data: {
        orchestrationMetaJson: orchestration as unknown as Prisma.InputJsonValue,
        sourcePlatformTemplateId: row.id,
        sourcePlatformTemplateVersion: row.updatedAt,
      },
    });
  } else {
    const draft = await createClubCommunicationDraft({
      tenantId: input.tenantId,
      senderUserId: input.actorUserId,
      kind: row.kind,
      subject: row.subject,
      bodyText: row.bodyText,
      audienceSpec: audience,
      acknowledgementRequired: row.kind === "ALERT",
    });
    draftId = draft.id;
    await prisma.platformCommunication.update({
      where: { id: draftId },
      data: {
        orchestrationMetaJson: orchestration as unknown as Prisma.InputJsonValue,
        sourcePlatformTemplateId: row.id,
        sourcePlatformTemplateVersion: row.updatedAt,
      },
    });
  }

  await recordPlatformTemplateAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    templateId: row.id,
    action: "PLATFORM_COMMUNICATION_TEMPLATE_USED",
    metadata: { communicationId: draftId },
  });

  const redirectPath =
    row.kind === "CAMPAIGN"
      ? `/dashboard/communication/kampagnen/${draftId}`
      : `/dashboard/communication/mitteilungen/${draftId}`;

  return { id: draftId, kind: row.kind, redirectPath };
}

export async function createTemplateFromCommunication(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
  name: string;
}): Promise<{ id: string }> {
  const communication = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
  });
  if (!communication) throw new TeamCommunicationNotFoundError();
  if (!isPlatformCommunicationTemplateKind(communication.kind)) {
    throw new TeamCommunicationValidationError("communication kind cannot be saved as template");
  }

  return createPlatformCommunicationTemplate({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    name: input.name,
    kind: communication.kind,
    internalName: communication.internalName,
    subject: communication.subject,
    bodyText: communication.bodyText,
    audienceSpec: communication.audienceSpecJson as CommunicationAudienceSpec,
    orchestration:
      parseCampaignOrchestrationMeta(communication.orchestrationMetaJson) ??
      defaultCampaignOrchestrationMeta(),
    status: "ACTIVE",
  });
}

/** Cross-tenant template references must fail closed at use time. */
export function assertTemplateTenantMatch(
  templateTenantId: string,
  expectedTenantId: string,
): void {
  if (templateTenantId !== expectedTenantId) {
    throw new TeamCommunicationForbiddenError("template tenant mismatch");
  }
}
