import "server-only";

import { SceTenantPublicRecordKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canViewMeldung, canViewMeldungInternal } from "@/lib/club-meldungen/access";
import {
  parseScePublicReference,
  scePublicReferenceFromNumber,
} from "@/lib/club-development/sce-public-reference";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { applyVisibilityFilter } from "@/lib/visibility/visibility-filter";
import {
  resolveTenantPublicReferenceDisplay,
} from "./sce-tenant-public-reference";
import {
  resolveTenantPublicReferenceFromLedger,
  type TenantPublicReferenceLedgerHit,
} from "./sce-tenant-public-reference-lookup";
import { sceTenantPublicRecordKindLabelKey } from "./sce-tenant-public-record-kind";

export type TenantPublicRecordLookupKind = "strategy" | "target" | "task" | "meldung";

export type TenantPublicRecordReferenceLookupResult = {
  kind: TenantPublicRecordLookupKind;
  id: string;
  publicReference: string;
  title: string;
  recordKindLabelKey: string;
  legacyScePublicReference: string | null;
  legacyAnliegenCaseNumber?: boolean;
};

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

async function loadTenantShortCode(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { publicReferenceShortCode: true },
  });
  return tenant?.publicReferenceShortCode ?? null;
}

async function authorizeTaskRead(
  actor: ActorContext,
  tenantId: string,
  taskId: string,
): Promise<boolean> {
  if (!actor.userId) return false;
  const taskCtx = await buildTaskServiceContextForActor(actor.userId, tenantId);
  if (!taskCtx) return false;
  const readable = await prisma.task.findFirst({
    where: { AND: [buildTaskReadWhere(taskCtx), { id: taskId, tenantId }] },
    select: { id: true },
  });
  return Boolean(readable);
}

function mapRecordKind(kind: SceTenantPublicRecordKind): TenantPublicRecordLookupKind {
  switch (kind) {
    case SceTenantPublicRecordKind.STRATEGY:
      return "strategy";
    case SceTenantPublicRecordKind.TARGET:
      return "target";
    case SceTenantPublicRecordKind.MELDUNG:
      return "meldung";
    default:
      return "task";
  }
}

async function resolveFromLedger(
  actor: ActorContext,
  tenantId: string,
  ledgerHit: TenantPublicReferenceLedgerHit,
): Promise<TenantPublicRecordReferenceLookupResult | null> {
  const shortCode = await loadTenantShortCode(tenantId);
  const kind = mapRecordKind(ledgerHit.recordKind);

  switch (ledgerHit.recordKind) {
    case SceTenantPublicRecordKind.TASK: {
      const task = await prisma.task.findFirst({
        where: { id: ledgerHit.entityId, tenantId },
        select: { id: true, title: true, scePublicNumber: true, tenantPublicNumber: true },
      });
      if (!task || !(await authorizeTaskRead(actor, tenantId, task.id))) return null;
      return {
        kind,
        id: task.id,
        publicReference: ledgerHit.publicReference,
        title: task.title,
        recordKindLabelKey: ledgerHit.recordKindLabelKey,
        legacyScePublicReference: scePublicReferenceFromNumber(task.scePublicNumber),
      };
    }
    case SceTenantPublicRecordKind.STRATEGY: {
      if (!canViewClubDevelopment(actor)) return null;
      const strategy = await prisma.clubStrategy.findFirst({
        where: { id: ledgerHit.entityId, tenantId },
        select: { id: true, title: true, scePublicNumber: true, tenantPublicNumber: true, scopeType: true },
      });
      if (!strategy) return null;
      return {
        kind,
        id: strategy.id,
        publicReference: ledgerHit.publicReference,
        title: strategy.title?.trim() || "Strategie",
        recordKindLabelKey: ledgerHit.recordKindLabelKey,
        legacyScePublicReference: scePublicReferenceFromNumber(strategy.scePublicNumber),
      };
    }
    case SceTenantPublicRecordKind.TARGET: {
      const target = await prisma.target.findFirst({
        where: { id: ledgerHit.entityId, tenantId },
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
      });
      if (!target) return null;
      const visible = applyVisibilityFilter([target], actor);
      if (visible.length !== 1) return null;
      return {
        kind,
        id: target.id,
        publicReference: ledgerHit.publicReference,
        title: target.title,
        recordKindLabelKey: ledgerHit.recordKindLabelKey,
        legacyScePublicReference: scePublicReferenceFromNumber(target.scePublicNumber),
      };
    }
    case SceTenantPublicRecordKind.MELDUNG: {
      if (!actor.userId) return null;
      const meldung = await prisma.clubMeldung.findFirst({
        where: { id: ledgerHit.entityId, tenantId },
        select: {
          id: true,
          subject: true,
          caseNumber: true,
          scePublicNumber: true,
          tenantPublicNumber: true,
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
      return {
        kind,
        id: meldung.id,
        publicReference: ledgerHit.publicReference,
        title: meldung.subject,
        recordKindLabelKey: ledgerHit.recordKindLabelKey,
        legacyScePublicReference: scePublicReferenceFromNumber(meldung.scePublicNumber),
      };
    }
    default:
      return null;
  }
}

export async function lookupTenantPublicRecordReference(
  actor: ActorContext,
  referenceInput: string,
): Promise<TenantPublicRecordReferenceLookupResult | null> {
  const tenantId = actorTenantId(actor);
  const trimmed = referenceInput.trim();
  if (!tenantId || !trimmed) return null;

  const ledgerHit = await resolveTenantPublicReferenceFromLedger(tenantId, trimmed);
  if (ledgerHit) {
    return resolveFromLedger(actor, tenantId, ledgerHit);
  }

  const sceParsed = parseScePublicReference(trimmed);
  if (!sceParsed) return null;

  const shortCode = await loadTenantShortCode(tenantId);
  const sequenceNumber = sceParsed.sequenceNumber;

  const [strategy, target, task, meldung] = await Promise.all([
    prisma.clubStrategy.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber },
      select: { id: true, title: true, scePublicNumber: true, tenantPublicNumber: true },
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
      },
    }),
    prisma.clubMeldung.findFirst({
      where: { tenantId, scePublicNumber: sequenceNumber },
      select: {
        id: true,
        subject: true,
        scePublicNumber: true,
        tenantPublicNumber: true,
        reporterUserId: true,
        accountableUserId: true,
      },
    }),
  ]);

  if (strategy && canViewClubDevelopment(actor)) {
    return {
      kind: "strategy",
      id: strategy.id,
      publicReference:
        resolveTenantPublicReferenceDisplay({
          tenantShortCode: shortCode,
          tenantPublicNumber: strategy.tenantPublicNumber,
          legacyScePublicNumber: strategy.scePublicNumber,
        }) ?? scePublicReferenceFromNumber(strategy.scePublicNumber)!,
      title: strategy.title?.trim() || "Strategie",
      recordKindLabelKey: sceTenantPublicRecordKindLabelKey(SceTenantPublicRecordKind.STRATEGY),
      legacyScePublicReference: scePublicReferenceFromNumber(strategy.scePublicNumber),
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
            tenantShortCode: shortCode,
            tenantPublicNumber: target.tenantPublicNumber,
            legacyScePublicNumber: target.scePublicNumber,
          }) ?? scePublicReferenceFromNumber(target.scePublicNumber)!,
        title: target.title,
        recordKindLabelKey: sceTenantPublicRecordKindLabelKey(SceTenantPublicRecordKind.TARGET),
        legacyScePublicReference: scePublicReferenceFromNumber(target.scePublicNumber),
      };
    }
  }

  if (task && actor.userId && (await authorizeTaskRead(actor, tenantId, task.id))) {
    return {
      kind: "task",
      id: task.id,
      publicReference:
        resolveTenantPublicReferenceDisplay({
          tenantShortCode: shortCode,
          tenantPublicNumber: task.tenantPublicNumber,
          legacyScePublicNumber: task.scePublicNumber,
        }) ?? scePublicReferenceFromNumber(task.scePublicNumber)!,
      title: task.title,
      recordKindLabelKey: sceTenantPublicRecordKindLabelKey(SceTenantPublicRecordKind.TASK),
      legacyScePublicReference: scePublicReferenceFromNumber(task.scePublicNumber),
    };
  }

  if (meldung && actor.userId) {
    const accessCtx = {
      actorUserId: actor.userId,
      permissionKeys: actor.permissionKeys,
    };
    if (canViewMeldungInternal(meldung, accessCtx) || canViewMeldung(meldung, accessCtx)) {
      return {
        kind: "meldung",
        id: meldung.id,
        publicReference:
          resolveTenantPublicReferenceDisplay({
            tenantShortCode: shortCode,
            tenantPublicNumber: meldung.tenantPublicNumber,
            legacyScePublicNumber: meldung.scePublicNumber,
          }) ?? scePublicReferenceFromNumber(meldung.scePublicNumber)!,
        title: meldung.subject,
        recordKindLabelKey: sceTenantPublicRecordKindLabelKey(SceTenantPublicRecordKind.MELDUNG),
        legacyScePublicReference: scePublicReferenceFromNumber(meldung.scePublicNumber),
      };
    }
  }

  return null;
}