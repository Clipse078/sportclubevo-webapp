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
import { lookupTenantPublicRecordReference } from "@/lib/tenant-public-reference/sce-tenant-record-reference-lookup";
import {
  parseTenantPublicReference,
  resolveTenantPublicReferenceDisplay,
} from "@/lib/tenant-public-reference/sce-tenant-public-reference";

export type ScePublicReferenceLookupKind =
  | "strategy"
  | "target"
  | "task"
  | "meldung";

export type ScePublicReferenceLookupResult =
  | {
      kind: ScePublicReferenceLookupKind;
      id: string;
      /** Canonical SCE-… when scePublicNumber exists; legacy Anliegen may return caseNumber. */
      publicReference: string;
      title: string;
      legacyAnliegenCaseNumber?: boolean;
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

async function lookupMeldungByLegacyCaseNumber(
  actor: ActorContext,
  tenantId: string,
  caseNumber: string,
): Promise<ScePublicReferenceLookupResult | null> {
  if (!actor.userId) return null;
  const meldung = await prisma.clubMeldung.findFirst({
    where: { tenantId, caseNumber: { equals: caseNumber, mode: "insensitive" } },
    select: {
      id: true,
      subject: true,
      caseNumber: true,
      scePublicNumber: true,
      reporterUserId: true,
      accountableUserId: true,
    },
  });
  if (!meldung) return null;
  const accessCtx = {
    actorUserId: actor.userId,
    permissionKeys: actor.permissionKeys,
  };
  if (!canViewMeldungInternal(meldung, accessCtx) && !canViewMeldung(meldung, accessCtx)) {
    return null;
  }
  const sceRef = scePublicReferenceFromNumber(meldung.scePublicNumber);
  return {
    kind: "meldung",
    id: meldung.id,
    publicReference: sceRef ?? meldung.caseNumber,
    title: meldung.subject,
    legacyAnliegenCaseNumber: !sceRef,
  };
}

/**
 * Permission-aware resolution of SCE-… or legacy Anliegen case numbers within the actor tenant.
 */
export async function lookupScePublicReference(
  actor: ActorContext,
  referenceInput: string,
): Promise<ScePublicReferenceLookupResult> {
  const tenantId = actorTenantId(actor);
  const trimmed = referenceInput.trim();
  if (!tenantId || !trimmed) return null;

  if (parseTenantPublicReference(trimmed)) {
    const tenantHit = await lookupTenantPublicRecordReference(actor, trimmed);
    if (tenantHit) {
      return {
        kind: tenantHit.kind,
        id: tenantHit.id,
        publicReference: tenantHit.publicReference,
        title: tenantHit.title,
        legacyAnliegenCaseNumber:
          tenantHit.kind === "meldung" && !tenantHit.legacyScePublicReference
            ? true
            : undefined,
      };
    }
    return null;
  }

  const parsed = parseScePublicReference(trimmed);
  if (!parsed) {
    return lookupMeldungByLegacyCaseNumber(actor, tenantId, trimmed);
  }

  const sequenceNumber = parsed.sequenceNumber;
  const tenantShortCodeRow = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { publicReferenceShortCode: true },
  });
  const tenantShortCode = tenantShortCodeRow?.publicReferenceShortCode ?? null;

  const [strategy, target, task, meldung] = await Promise.all([
    prisma.clubStrategy.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber },
      select: { id: true, title: true, scePublicNumber: true, tenantPublicNumber: true, scopeType: true },
    }),
    prisma.target.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber },
      select: {
        id: true,
        title: true,
        scePublicNumber: true,
        tenantPublicNumber: true,
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
      select: {
        id: true,
        title: true,
        scePublicNumber: true,
        tenantPublicNumber: true,
        status: true,
      },
    }),
    prisma.clubMeldung.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber },
      select: {
        id: true,
        subject: true,
        scePublicNumber: true,
        tenantPublicNumber: true,
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
      publicReference:
        resolveTenantPublicReferenceDisplay({
          tenantShortCode,
          tenantPublicNumber: strategy.tenantPublicNumber,
          legacyScePublicNumber: strategy.scePublicNumber,
        }) ?? scePublicReferenceFromNumber(strategy.scePublicNumber)!,
      title: strategy.title?.trim() || "Strategie",
    };
  }

  if (target) {
    const visible = applyVisibilityFilter([target], actor);
    if (visible.length === 1) {
      return {
        kind: "target",
        id: target.id,
        publicReference:
          resolveTenantPublicReferenceDisplay({
            tenantShortCode,
            tenantPublicNumber: target.tenantPublicNumber,
            legacyScePublicNumber: target.scePublicNumber,
          }) ?? scePublicReferenceFromNumber(target.scePublicNumber)!,
        title: target.title,
      };
    }
  }

  if (task && actor.userId) {
    const taskCtx = await buildTaskServiceContextForActor(actor.userId, tenantId);
    if (taskCtx) {
      const readable = await prisma.task.findFirst({
        where: { AND: [buildTaskReadWhere(taskCtx), { id: task.id }] },
        select: { id: true },
      });
      if (readable) {
        return {
          kind: "task",
          id: task.id,
          publicReference:
            resolveTenantPublicReferenceDisplay({
              tenantShortCode: taskCtx.tenantPublicReferenceShortCode,
              tenantPublicNumber: task.tenantPublicNumber,
              legacyScePublicNumber: task.scePublicNumber,
            }) ?? scePublicReferenceFromNumber(task.scePublicNumber)!,
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
        publicReference:
          resolveTenantPublicReferenceDisplay({
            tenantShortCode,
            tenantPublicNumber: meldung.tenantPublicNumber,
            legacyScePublicNumber: meldung.scePublicNumber,
          }) ?? scePublicReferenceFromNumber(meldung.scePublicNumber)!,
        title: meldung.subject,
      };
    }
  }

  return null;
}