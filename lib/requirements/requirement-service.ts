/**
 * AUFGABEN-06G1 — canonical Requirement domain service.
 */

import { Prisma, type RequirementStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  assertActorCanRespondForPerson,
  getAuthorizedPersonIdsForUser,
} from "@/lib/participation/authorization";
import {
  canCreateRequirement,
  canManageRequirement,
  canReadRequirement,
  canReadRequirementAggregate,
  canListRequirementRecipients,
  canReadOwnRequirementRecipient,
  canRespondToRequirementRecipient,
  hasRequirementPermission,
  type RequirementAuthorizationRecord,
} from "./requirement-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { computeRequirementAggregate } from "./requirement-aggregate";
import { resolveRequirementAudiencePersonIds } from "./requirement-audience";
import {
  resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds,
  resolveTargetGroupAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "./requirement-audience-resolvers";
import {
  emitRequirementAssignedNotifications,
  emitRequirementCancelledNotifications,
} from "@/lib/notifications/requirement-producer";
import {
  RequirementForbiddenError,
  RequirementNotFoundError,
  RequirementRecipientNotFoundError,
  RequirementTenantMismatchError,
  RequirementValidationError,
} from "./errors";
import type {
  CreateRequirementDraftInput,
  ListRequirementRecipientsFilter,
  ListRequirementsFilter,
  RequirementDraftAudienceInput,
  RequirementDto,
  RequirementRecipientDto,
  RequirementServiceContext,
  UpdateRequirementDraftInput,
} from "./types";
import {
  DEFAULT_REQUIREMENT_LIST_LIMIT,
  MAX_REQUIREMENT_LIST_LIMIT,
} from "./types";

const REQUIREMENT_INCLUDE = {
  draftAudience: { select: { personId: true } },
  draftAudienceTeams: { select: { teamId: true } },
  draftAudienceOrgUnits: { select: { orgUnitId: true } },
  draftAudienceRoles: { select: { roleId: true } },
  draftAudienceTargetGroups: { select: { targetGroupId: true } },
} as const;

type RequirementRow = Prisma.RequirementGetPayload<{ include: typeof REQUIREMENT_INCLUDE }>;

function mapRequirement(row: RequirementRow): RequirementDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    status: row.status,
    responseMode: row.responseMode,
    dueAt: row.dueAt?.toISOString() ?? null,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    draftAudiencePersonIds: row.draftAudience.map((entry) => entry.personId),
    draftAudienceTeamIds: row.draftAudienceTeams.map((entry) => entry.teamId),
    draftAudienceOrgUnitIds: row.draftAudienceOrgUnits.map((entry) => entry.orgUnitId),
    draftAudienceRoleIds: row.draftAudienceRoles.map((entry) => entry.roleId),
    draftAudienceTargetGroupIds: row.draftAudienceTargetGroups.map((entry) => entry.targetGroupId),
  };
}

function mapRecipient(
  row: Prisma.RequirementRecipientGetPayload<object>,
): RequirementRecipientDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    requirementId: row.requirementId,
    subjectPersonId: row.subjectPersonId,
    resolutionStatus: row.resolutionStatus,
    responseValue: row.responseValue,
    respondedAt: row.respondedAt?.toISOString() ?? null,
    respondedByUserId: row.respondedByUserId,
    responseActorPersonId: row.responseActorPersonId,
    removedAt: row.removedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function hasRequirementListRead(ctx: RequirementServiceContext): boolean {
  return (
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW) ||
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE)
  );
}

function authRecord(row: RequirementRow | RequirementAuthorizationRecord): RequirementAuthorizationRecord {
  return {
    tenantId: row.tenantId,
    createdByUserId: "createdByUserId" in row ? row.createdByUserId : null,
  };
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new RequirementValidationError("Title is required");
  }
  return trimmed;
}

function dedupePersonIds(personIds: readonly string[]): string[] {
  return [...new Set(personIds.map((id) => id.trim()).filter(Boolean))];
}

async function assertSameTenantPersonIds(
  tenantId: string,
  personIds: readonly string[],
): Promise<void> {
  if (personIds.length === 0) return;
  const found = await prisma.person.findMany({
    where: { tenantId, id: { in: [...personIds] } },
    select: { id: true },
  });
  if (found.length !== personIds.length) {
    throw new RequirementTenantMismatchError("One or more persons are not in this tenant");
  }
}

function normalizeAudienceInput(input: RequirementDraftAudienceInput): {
  personIds: string[];
  teamIds: string[];
  orgUnitIds: string[];
  roleIds: string[];
  targetGroupIds: string[];
} {
  return {
    personIds: dedupePersonIds(input.personIds ?? []),
    teamIds: dedupePersonIds(input.teamIds ?? []),
    orgUnitIds: dedupePersonIds(input.orgUnitIds ?? []),
    roleIds: dedupePersonIds(input.roleIds ?? []),
    targetGroupIds: dedupePersonIds(input.targetGroupIds ?? []),
  };
}

async function assertValidDraftAudienceSelectors(
  tenantId: string,
  selectors: ReturnType<typeof normalizeAudienceInput>,
): Promise<void> {
  await assertSameTenantPersonIds(tenantId, selectors.personIds);

  try {
    if (selectors.teamIds.length > 0) {
      await resolveTeamAudiencePersonIds(tenantId, selectors.teamIds);
    }
    if (selectors.orgUnitIds.length > 0) {
      await resolveOrgUnitAudiencePersonIds(tenantId, selectors.orgUnitIds);
    }
    if (selectors.roleIds.length > 0) {
      await resolveRoleAudiencePersonIds(tenantId, selectors.roleIds);
    }
    if (selectors.targetGroupIds.length > 0) {
      await resolveTargetGroupAudiencePersonIds(tenantId, selectors.targetGroupIds);
    }
  } catch {
    throw new RequirementTenantMismatchError("One or more audience selectors are invalid for this tenant");
  }
}

async function replaceRequirementDraftAudience(
  tenantId: string,
  requirementId: string,
  selectors: ReturnType<typeof normalizeAudienceInput>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.requirementDraftAudiencePerson.deleteMany({ where: { tenantId, requirementId } });
    await tx.requirementDraftAudienceTeam.deleteMany({ where: { tenantId, requirementId } });
    await tx.requirementDraftAudienceOrgUnit.deleteMany({ where: { tenantId, requirementId } });
    await tx.requirementDraftAudienceRole.deleteMany({ where: { tenantId, requirementId } });
    await tx.requirementDraftAudienceTargetGroup.deleteMany({ where: { tenantId, requirementId } });

    if (selectors.personIds.length > 0) {
      await tx.requirementDraftAudiencePerson.createMany({
        data: selectors.personIds.map((personId) => ({ tenantId, requirementId, personId })),
      });
    }
    if (selectors.teamIds.length > 0) {
      await tx.requirementDraftAudienceTeam.createMany({
        data: selectors.teamIds.map((teamId) => ({ tenantId, requirementId, teamId })),
      });
    }
    if (selectors.orgUnitIds.length > 0) {
      await tx.requirementDraftAudienceOrgUnit.createMany({
        data: selectors.orgUnitIds.map((orgUnitId) => ({ tenantId, requirementId, orgUnitId })),
      });
    }
    if (selectors.roleIds.length > 0) {
      await tx.requirementDraftAudienceRole.createMany({
        data: selectors.roleIds.map((roleId) => ({ tenantId, requirementId, roleId })),
      });
    }
    if (selectors.targetGroupIds.length > 0) {
      await tx.requirementDraftAudienceTargetGroup.createMany({
        data: selectors.targetGroupIds.map((targetGroupId) => ({
          tenantId,
          requirementId,
          targetGroupId,
        })),
      });
    }
  });
}

async function loadRequirementOrThrow(
  tenantId: string,
  requirementId: string,
): Promise<RequirementRow> {
  const row = await prisma.requirement.findFirst({
    where: { id: requirementId, tenantId },
    include: REQUIREMENT_INCLUDE,
  });
  if (!row) {
    throw new RequirementNotFoundError(requirementId);
  }
  return row;
}

export async function createRequirementDraft(
  ctx: RequirementServiceContext,
  input: CreateRequirementDraftInput,
): Promise<RequirementDto> {
  if (!canCreateRequirement(ctx)) {
    throw new RequirementForbiddenError();
  }

  const title = normalizeTitle(input.title);
  const row = await prisma.requirement.create({
    data: {
      tenantId: ctx.tenantId,
      title,
      description: input.description?.trim() || null,
      responseMode: input.responseMode ?? "ACKNOWLEDGE",
      dueAt: input.dueAt ?? null,
      createdByUserId: ctx.userId,
    },
    include: REQUIREMENT_INCLUDE,
  });

  return mapRequirement(row);
}

export async function updateRequirementDraft(
  ctx: RequirementServiceContext,
  requirementId: string,
  input: UpdateRequirementDraftInput,
): Promise<RequirementDto> {
  const existing = await loadRequirementOrThrow(ctx.tenantId, requirementId);
  if (!canManageRequirement(ctx, authRecord(existing))) {
    throw new RequirementForbiddenError();
  }

  if (existing.status === "CLOSED" || existing.status === "CANCELLED") {
    throw new RequirementValidationError("Requirement is read-only");
  }

  const data: Prisma.RequirementUpdateInput = {};

  if (existing.status === "DRAFT") {
    if (input.title !== undefined) data.title = normalizeTitle(input.title);
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.responseMode !== undefined) data.responseMode = input.responseMode;
    if (input.dueAt !== undefined) data.dueAt = input.dueAt;
  } else if (existing.status === "ACTIVE") {
    if (input.responseMode !== undefined && input.responseMode !== existing.responseMode) {
      throw new RequirementValidationError("Response mode is frozen after activation");
    }
    if (input.title !== undefined) data.title = normalizeTitle(input.title);
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.dueAt !== undefined) data.dueAt = input.dueAt;
  } else {
    throw new RequirementValidationError("Invalid requirement status for update");
  }

  const row = await prisma.requirement.update({
    where: { id: requirementId },
    data,
    include: REQUIREMENT_INCLUDE,
  });

  return mapRequirement(row);
}

export async function setRequirementDraftAudience(
  ctx: RequirementServiceContext,
  requirementId: string,
  personIds: readonly string[],
): Promise<RequirementDto> {
  return setRequirementDraftAudienceSelectors(ctx, requirementId, { personIds });
}

export async function setRequirementDraftAudienceSelectors(
  ctx: RequirementServiceContext,
  requirementId: string,
  input: RequirementDraftAudienceInput,
): Promise<RequirementDto> {
  const existing = await loadRequirementOrThrow(ctx.tenantId, requirementId);
  if (!canManageRequirement(ctx, authRecord(existing))) {
    throw new RequirementForbiddenError();
  }
  if (existing.status !== "DRAFT") {
    throw new RequirementValidationError("Audience is frozen unless requirement is DRAFT");
  }

  const selectors = normalizeAudienceInput(input);
  await assertValidDraftAudienceSelectors(ctx.tenantId, selectors);
  await replaceRequirementDraftAudience(ctx.tenantId, requirementId, selectors);

  return mapRequirement(await loadRequirementOrThrow(ctx.tenantId, requirementId));
}

export async function activateRequirement(
  ctx: RequirementServiceContext,
  requirementId: string,
): Promise<RequirementDto> {
  const existing = await loadRequirementOrThrow(ctx.tenantId, requirementId);
  if (!canManageRequirement(ctx, authRecord(existing))) {
    throw new RequirementForbiddenError();
  }

  if (existing.status === "ACTIVE") {
    return mapRequirement(existing);
  }

  if (existing.status !== "DRAFT") {
    throw new RequirementValidationError("Only DRAFT requirements can be activated");
  }

  normalizeTitle(existing.title);
  if (existing.responseMode !== "ACKNOWLEDGE") {
    throw new RequirementValidationError("Unsupported response mode");
  }

  const audiencePersonIds = await resolveRequirementAudiencePersonIds(ctx.tenantId, requirementId);
  if (audiencePersonIds.length === 0) {
    throw new RequirementValidationError("Audience must not be empty");
  }

  await assertSameTenantPersonIds(ctx.tenantId, audiencePersonIds);

  const activatedAt = new Date();

  const tenantLocaleRow = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { locale: true, timezone: true },
  });
  const locale = tenantLocaleRow?.locale ?? "de-CH";
  const timeZone = tenantLocaleRow?.timezone ?? "Europe/Zurich";

  await prisma.$transaction(async (tx) => {
    const locked = await tx.requirement.findFirst({
      where: { id: requirementId, tenantId: ctx.tenantId },
      select: { status: true },
    });
    if (!locked) {
      throw new RequirementNotFoundError(requirementId);
    }
    if (locked.status === "ACTIVE") {
      return;
    }
    if (locked.status !== "DRAFT") {
      throw new RequirementValidationError("Only DRAFT requirements can be activated");
    }

    await tx.requirementRecipient.createMany({
      data: audiencePersonIds.map((personId) => ({
        tenantId: ctx.tenantId,
        requirementId,
        subjectPersonId: personId,
      })),
      skipDuplicates: true,
    });

    const updated = await tx.requirement.updateMany({
      where: { id: requirementId, tenantId: ctx.tenantId, status: "DRAFT" },
      data: { status: "ACTIVE", activatedAt },
    });

    if (updated.count !== 1) {
      const current = await tx.requirement.findFirst({
        where: { id: requirementId, tenantId: ctx.tenantId },
        select: { status: true },
      });
      if (current?.status === "ACTIVE") {
        return;
      }
      throw new RequirementValidationError("Activation failed");
    }

    await tx.requirementDraftAudiencePerson.deleteMany({
      where: { tenantId: ctx.tenantId, requirementId },
    });
    await tx.requirementDraftAudienceTeam.deleteMany({
      where: { tenantId: ctx.tenantId, requirementId },
    });
    await tx.requirementDraftAudienceOrgUnit.deleteMany({
      where: { tenantId: ctx.tenantId, requirementId },
    });
    await tx.requirementDraftAudienceRole.deleteMany({
      where: { tenantId: ctx.tenantId, requirementId },
    });
    await tx.requirementDraftAudienceTargetGroup.deleteMany({
      where: { tenantId: ctx.tenantId, requirementId },
    });

    const recipients = await tx.requirementRecipient.findMany({
      where: { tenantId: ctx.tenantId, requirementId },
      select: { id: true, subjectPersonId: true },
    });

    await emitRequirementAssignedNotifications(tx, {
      tenantId: ctx.tenantId,
      requirementId,
      requirementTitle: existing.title,
      dueAt: existing.dueAt,
      recipients,
      locale,
      timeZone,
    });
  });

  return mapRequirement(await loadRequirementOrThrow(ctx.tenantId, requirementId));
}

export async function getRequirement(
  ctx: RequirementServiceContext,
  requirementId: string,
): Promise<RequirementDto> {
  const row = await loadRequirementOrThrow(ctx.tenantId, requirementId);
  if (!canReadRequirement(ctx, authRecord(row))) {
    throw new RequirementForbiddenError();
  }
  return mapRequirement(row);
}

export async function listRequirements(
  ctx: RequirementServiceContext,
  filter: ListRequirementsFilter = {},
): Promise<RequirementDto[]> {
  const canList =
    canManageRequirement(ctx) ||
    hasRequirementListRead(ctx);
  if (!canList) {
    throw new RequirementForbiddenError();
  }

  const limit = Math.min(filter.limit ?? DEFAULT_REQUIREMENT_LIST_LIMIT, MAX_REQUIREMENT_LIST_LIMIT);
  const statusFilter = filter.status
    ? Array.isArray(filter.status)
      ? filter.status
      : [filter.status]
    : undefined;

  const rows = await prisma.requirement.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
      ...(filter.cursor ? { id: { gt: filter.cursor } } : {}),
    },
    include: REQUIREMENT_INCLUDE,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
  });

  return rows.map(mapRequirement);
}

export async function listRequirementRecipients(
  ctx: RequirementServiceContext,
  filter: ListRequirementRecipientsFilter,
): Promise<RequirementRecipientDto[]> {
  const requirement = await loadRequirementOrThrow(ctx.tenantId, filter.requirementId);
  if (!canListRequirementRecipients(ctx, authRecord(requirement))) {
    throw new RequirementForbiddenError();
  }

  const limit = Math.min(filter.limit ?? DEFAULT_REQUIREMENT_LIST_LIMIT, MAX_REQUIREMENT_LIST_LIMIT);

  const rows = await prisma.requirementRecipient.findMany({
    where: {
      tenantId: ctx.tenantId,
      requirementId: filter.requirementId,
      ...(filter.resolutionStatus ? { resolutionStatus: filter.resolutionStatus } : {}),
      ...(filter.cursor ? { id: { gt: filter.cursor } } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
  });

  return rows.map(mapRecipient);
}

export async function getRequirementAggregate(
  ctx: RequirementServiceContext,
  requirementId: string,
) {
  const requirement = await loadRequirementOrThrow(ctx.tenantId, requirementId);
  if (!canReadRequirementAggregate(ctx, authRecord(requirement))) {
    throw new RequirementForbiddenError();
  }
  return computeRequirementAggregate(prisma, ctx.tenantId, requirementId);
}

export async function getOwnRequirementRecipient(
  ctx: RequirementServiceContext,
  recipientId: string,
): Promise<RequirementRecipientDto> {
  const row = await prisma.requirementRecipient.findFirst({
    where: { id: recipientId, tenantId: ctx.tenantId },
  });
  if (!row) {
    throw new RequirementRecipientNotFoundError(recipientId);
  }
  const authorizedSubjectPersonIds = await getAuthorizedPersonIdsForUser(ctx.tenantId, ctx.userId);
  if (
    !canReadOwnRequirementRecipient(
      ctx,
      {
        tenantId: row.tenantId,
        requirementId: row.requirementId,
        subjectPersonId: row.subjectPersonId,
        removedAt: row.removedAt,
      },
      authorizedSubjectPersonIds,
    )
  ) {
    throw new RequirementForbiddenError();
  }
  return mapRecipient(row);
}

export async function acknowledgeRequirementRecipient(
  ctx: RequirementServiceContext,
  recipientId: string,
): Promise<RequirementRecipientDto> {
  const existing = await prisma.requirementRecipient.findFirst({
    where: { id: recipientId, tenantId: ctx.tenantId },
    include: { requirement: { select: { status: true, responseMode: true, tenantId: true } } },
  });

  if (!existing) {
    throw new RequirementRecipientNotFoundError(recipientId);
  }

  if (existing.requirement.tenantId !== ctx.tenantId) {
    throw new RequirementTenantMismatchError();
  }

  const actorContext = await assertActorCanRespondForPerson(
    ctx.tenantId,
    ctx.userId,
    existing.subjectPersonId,
  );
  const authorizedPersonIds = await getAuthorizedPersonIdsForUser(ctx.tenantId, ctx.userId);

  if (
    !canRespondToRequirementRecipient(
      ctx,
      {
        tenantId: existing.tenantId,
        requirementId: existing.requirementId,
        subjectPersonId: existing.subjectPersonId,
        removedAt: existing.removedAt,
      },
      authorizedPersonIds,
    )
  ) {
    throw new RequirementForbiddenError();
  }

  if (existing.removedAt) {
    throw new RequirementValidationError("Recipient was removed");
  }

  if (existing.requirement.status !== "ACTIVE") {
    throw new RequirementValidationError("Requirement is not accepting responses");
  }

  if (existing.requirement.responseMode !== "ACKNOWLEDGE") {
    throw new RequirementValidationError("Unsupported response mode");
  }

  if (existing.resolutionStatus === "RESOLVED") {
    return mapRecipient(existing);
  }

  const respondedAt = new Date();
  const updated = await prisma.requirementRecipient.update({
    where: { id: existing.id },
    data: {
      resolutionStatus: "RESOLVED",
      responseValue: "ACKNOWLEDGED",
      respondedAt,
      respondedByUserId: ctx.userId,
      responseActorPersonId: actorContext.actorPersonId,
    },
  });

  return mapRecipient(updated);
}

export async function closeRequirement(
  ctx: RequirementServiceContext,
  requirementId: string,
): Promise<RequirementDto> {
  const existing = await loadRequirementOrThrow(ctx.tenantId, requirementId);
  if (!canManageRequirement(ctx, authRecord(existing))) {
    throw new RequirementForbiddenError();
  }
  if (existing.status !== "ACTIVE") {
    throw new RequirementValidationError("Only ACTIVE requirements can be closed");
  }

  const row = await prisma.requirement.update({
    where: { id: requirementId },
    data: { status: "CLOSED", closedAt: new Date() },
    include: REQUIREMENT_INCLUDE,
  });
  return mapRequirement(row);
}

export async function cancelRequirement(
  ctx: RequirementServiceContext,
  requirementId: string,
): Promise<RequirementDto> {
  const existing = await loadRequirementOrThrow(ctx.tenantId, requirementId);
  if (!canManageRequirement(ctx, authRecord(existing))) {
    throw new RequirementForbiddenError();
  }
  if (existing.status !== "ACTIVE") {
    throw new RequirementValidationError("Only ACTIVE requirements can be cancelled");
  }

  const row = await prisma.requirement.update({
    where: { id: requirementId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    include: REQUIREMENT_INCLUDE,
  });

  const recipients = await prisma.requirementRecipient.findMany({
    where: {
      tenantId: ctx.tenantId,
      requirementId,
      removedAt: null,
    },
    select: { id: true, subjectPersonId: true },
  });

  await emitRequirementCancelledNotifications({
    tenantId: ctx.tenantId,
    requirementId,
    requirementTitle: row.title,
    recipients,
  });

  return mapRequirement(row);
}

export function assertValidRequirementStatusTransition(
  from: RequirementStatus,
  to: RequirementStatus,
): void {
  const allowed: Record<RequirementStatus, RequirementStatus[]> = {
    DRAFT: ["ACTIVE"],
    ACTIVE: ["CLOSED", "CANCELLED"],
    CLOSED: [],
    CANCELLED: [],
  };
  if (!allowed[from].includes(to)) {
    throw new RequirementValidationError(`Invalid transition ${from} → ${to}`);
  }
}
