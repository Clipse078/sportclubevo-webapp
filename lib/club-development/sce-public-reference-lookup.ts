import "server-only";

import { prisma } from "@/lib/db/prisma";
import { canViewMeldung, canViewMeldungInternal } from "@/lib/club-meldungen/access";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { applyVisibilityFilter, buildVisibilityWhere } from "@/lib/visibility/visibility-filter";
import {
  parseScePublicReference,
  scePublicReferenceFromNumber,
} from "@/lib/club-development/sce-public-reference";

export type ScePublicReferenceLookupKind =
  | "strategy"
  | "target"
  | "task"
  | "meldung";

export type ScePublicReferenceLookupResult =
  | {
      kind: ScePublicReferenceLookupKind;
      id: string;
      publicReference: string;
      title: string;
    }
  | null;

function actorTenantId(actor: ActorContext): string | null {
  return actor.tenantId?.trim() || null;
}

function canViewClubDevelopment(actor: ActorContext): boolean {
  return actor.permissionKeys.some(
    (k) =>
      k === PERMISSIONS.TARGETS_VIEW ||
      k === PERMISSIONS.TARGETS_MANAGE ||
      k === PERMISSIONS.TASKS_VIEW ||
      k === PERMISSIONS.TASKS_MANAGE ||
      k === PERMISSIONS.INITIATIVES_VIEW ||
      k === PERMISSIONS.INITIATIVES_MANAGE,
  );
}

/**
 * Permission-aware resolution of a formatted SCE reference within the actor tenant.
 */
export async function lookupScePublicReference(
  actor: ActorContext,
  referenceInput: string,
): Promise<ScePublicReferenceLookupResult> {
  const tenantId = actorTenantId(actor);
  const parsed = parseScePublicReference(referenceInput);
  if (!tenantId || !parsed) return null;

  const sequenceNumber = parsed.sequenceNumber;

  const [strategy, target, task, meldung] = await Promise.all([
    prisma.clubStrategy.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber },
      select: { id: true, title: true, scePublicNumber: true, scopeType: true },
    }),
    prisma.target.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber, ...buildVisibilityWhere(actor) },
      select: {
        id: true,
        title: true,
        scePublicNumber: true,
        visibilityScope: true,
        createdByUserId: true,
        visibleRoleRefs: true,
        visibleUserRefs: true,
        visibleTeamRefs: true,
        visibleOrgUnitRefs: true,
        visiblePersonRefs: true,
        visibleTargetGroupRefs: true,
      },
    }),
    prisma.task.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber },
      select: { id: true, title: true, scePublicNumber: true, status: true },
    }),
    prisma.clubMeldung.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber },
      select: {
        id: true,
        subject: true,
        scePublicNumber: true,
        status: true,
        reporterUserId: true,
        accountableUserId: true,
        urgent: true,
      },
    }),
  ]);

  if (strategy && canViewClubDevelopment(actor)) {
    return {
      kind: "strategy",
      id: strategy.id,
      publicReference: scePublicReferenceFromNumber(strategy.scePublicNumber)!,
      title: strategy.title?.trim() || "Strategie",
    };
  }

  if (target) {
    const visible = applyVisibilityFilter([target], actor);
    if (visible.length === 1) {
      return {
        kind: "target",
        id: target.id,
        publicReference: scePublicReferenceFromNumber(target.scePublicNumber)!,
        title: target.title,
      };
    }
  }

  if (task && actor.userId) {
    const taskCtx = await buildTaskServiceContextForActor(actor.userId, tenantId);
    if (taskCtx) {
      const readable = await prisma.task.findFirst({
        where: buildTaskReadWhere(taskCtx, { id: task.id }),
        select: { id: true },
      });
      if (readable) {
        return {
          kind: "task",
          id: task.id,
          publicReference: scePublicReferenceFromNumber(task.scePublicNumber)!,
          title: task.title,
        };
      }
    }
  }

  if (meldung && actor.userId) {
    const accessCtx = {
      actorUserId: actor.userId,
      permissionKeys: actor.permissionKeys,
    };
    const internalVisible = canViewMeldungInternal(meldung, accessCtx);
    const publicVisible = canViewMeldung(meldung, accessCtx);
    if (internalVisible || publicVisible) {
      return {
        kind: "meldung",
        id: meldung.id,
        publicReference: scePublicReferenceFromNumber(meldung.scePublicNumber)!,
        title: meldung.subject,
      };
    }
  }

  return null;
}