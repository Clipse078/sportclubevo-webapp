import type { PlanningResourceType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import {
  canCreateRequirement,
  canManageRequirement,
  canReadRequirement,
} from "@/lib/requirements/requirement-authorization";
import { RequirementForbiddenError, RequirementValidationError } from "@/lib/requirements/errors";
import type { RequirementServiceContext } from "@/lib/requirements/types";
import {
  assertPlanningResourceExistsForTenant,
  type PlanningResourceRef,
} from "./planning-resource-identity";

export type PlanningLinkedRequirementDto = {
  referenceId: string;
  requirementId: string;
  title: string;
  status: string;
  href: string;
};

export async function listAuthorizedRequirementsForPlanningResource(
  ctx: RequirementServiceContext,
  ref: PlanningResourceRef,
): Promise<PlanningLinkedRequirementDto[]> {
  await assertPlanningResourceExistsForTenant(ctx.tenantId, ref);

  const links = await prisma.requirementPlanningResourceReference.findMany({
    where: {
      tenantId: ctx.tenantId,
      resourceType: ref.resourceType,
      resourceId: ref.resourceId,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      requirementId: true,
      requirement: {
        select: {
          id: true,
          title: true,
          status: true,
          tenantId: true,
          createdByUserId: true,
        },
      },
    },
  });

  const visible: PlanningLinkedRequirementDto[] = [];
  for (const link of links) {
    if (!canReadRequirement(ctx, link.requirement)) continue;
    visible.push({
      referenceId: link.id,
      requirementId: link.requirement.id,
      title: link.requirement.title,
      status: link.requirement.status,
      href: `/dashboard/aufgaben/anforderungen/${encodeURIComponent(link.requirement.id)}`,
    });
  }
  return visible;
}

export async function linkRequirementToPlanningResource(
  ctx: RequirementServiceContext,
  requirementId: string,
  ref: PlanningResourceRef,
): Promise<void> {
  const requirement = await prisma.requirement.findFirst({
    where: { id: requirementId, tenantId: ctx.tenantId },
    select: { id: true, tenantId: true, createdByUserId: true, status: true, title: true },
  });
  if (!requirement) {
    throw new RequirementValidationError("Requirement not found");
  }
  if (!canManageRequirement(ctx, requirement) && !canCreateRequirement(ctx)) {
    throw new RequirementForbiddenError();
  }

  await assertPlanningResourceExistsForTenant(ctx.tenantId, ref);

  const existing = await prisma.requirementPlanningResourceReference.findFirst({
    where: {
      tenantId: ctx.tenantId,
      requirementId,
      resourceType: ref.resourceType,
      resourceId: ref.resourceId,
    },
    select: { id: true },
  });
  if (existing) return;

  await prisma.requirementPlanningResourceReference.create({
    data: {
      tenantId: ctx.tenantId,
      requirementId,
      resourceType: ref.resourceType,
      resourceId: ref.resourceId,
      createdByUserId: ctx.userId,
    },
  });

  void writeAuditRecord(prisma, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    moduleKey: "requirements",
    entityType: "Requirement",
    entityId: requirementId,
    action: "PLANNING_RESOURCE_LINK",
    afterJson: {
      resourceType: ref.resourceType,
      resourceId: ref.resourceId,
    },
  });
}

export async function unlinkRequirementFromPlanningResource(
  ctx: RequirementServiceContext,
  referenceId: string,
): Promise<void> {
  const reference = await prisma.requirementPlanningResourceReference.findFirst({
    where: { id: referenceId, tenantId: ctx.tenantId },
    select: {
      id: true,
      requirementId: true,
      resourceType: true,
      resourceId: true,
      requirement: {
        select: { tenantId: true, createdByUserId: true },
      },
    },
  });
  if (!reference) {
    throw new RequirementValidationError("Reference not found");
  }
  if (!canManageRequirement(ctx, reference.requirement)) {
    throw new RequirementForbiddenError();
  }

  await prisma.requirementPlanningResourceReference.delete({
    where: { id: reference.id },
  });

  void writeAuditRecord(prisma, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    moduleKey: "requirements",
    entityType: "Requirement",
    entityId: reference.requirementId,
    action: "PLANNING_RESOURCE_UNLINK",
    beforeJson: {
      resourceType: reference.resourceType,
      resourceId: reference.resourceId,
    },
  });
}

export function planningResourceRef(
  resourceType: PlanningResourceType,
  resourceId: string,
): PlanningResourceRef {
  return { resourceType, resourceId: resourceId.trim() };
}
