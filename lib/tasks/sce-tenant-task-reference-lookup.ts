import "server-only";

import { SceTenantPublicRecordKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseScePublicReference, scePublicReferenceFromNumber } from "@/lib/club-development/sce-public-reference";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { resolveTenantPublicReferenceDisplay } from "@/lib/tenant-public-reference/sce-tenant-public-reference";
import { resolveTenantPublicReferenceFromLedger } from "@/lib/tenant-public-reference/sce-tenant-public-reference-lookup";

export type TenantTaskReferenceLookupResult =
  | {
      kind: "task";
      id: string;
      publicReference: string;
      title: string;
      legacyScePublicReference: string | null;
      recordKindLabelKey: string;
    }
  | null;

function actorTenantId(actor: ActorContext): string | null {
  return actor.tenantId?.trim() || null;
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

/**
 * Permission-aware exact lookup for tenant-wide references (TASK rows today) and legacy SCE task refs.
 */
export async function lookupTenantTaskReference(
  actor: ActorContext,
  referenceInput: string,
): Promise<TenantTaskReferenceLookupResult> {
  const tenantId = actorTenantId(actor);
  const trimmed = referenceInput.trim();
  if (!tenantId || !trimmed) return null;

  const ledgerHit = await resolveTenantPublicReferenceFromLedger(tenantId, trimmed);
  if (ledgerHit) {
    if (ledgerHit.recordKind !== SceTenantPublicRecordKind.TASK) {
      return null;
    }
    const task = await prisma.task.findFirst({
      where: { id: ledgerHit.entityId, tenantId },
      select: {
        id: true,
        title: true,
        tenantPublicNumber: true,
        scePublicNumber: true,
      },
    });
    if (!task || !(await authorizeTaskRead(actor, tenantId, task.id))) return null;
    const taskCtx = actor.userId
      ? await buildTaskServiceContextForActor(actor.userId, tenantId)
      : null;
    return {
      kind: "task",
      id: task.id,
      publicReference: ledgerHit.publicReference,
      title: task.title,
      legacyScePublicReference: scePublicReferenceFromNumber(task.scePublicNumber),
      recordKindLabelKey: ledgerHit.recordKindLabelKey,
    };
  }

  const sceParsed = parseScePublicReference(trimmed);
  if (!sceParsed) return null;

  const task = await prisma.task.findFirst({
    where: { tenantId, scePublicNumber: sceParsed.sequenceNumber },
    select: {
      id: true,
      title: true,
      tenantPublicNumber: true,
      scePublicNumber: true,
    },
  });
  if (!task) return null;
  if (!(await authorizeTaskRead(actor, tenantId, task.id))) return null;

  const taskCtx = actor.userId
    ? await buildTaskServiceContextForActor(actor.userId, tenantId)
    : null;

  return {
    kind: "task",
    id: task.id,
    publicReference:
      resolveTenantPublicReferenceDisplay({
        tenantShortCode: taskCtx?.tenantPublicReferenceShortCode,
        tenantPublicNumber: task.tenantPublicNumber,
        legacyScePublicNumber: task.scePublicNumber,
      }) ?? scePublicReferenceFromNumber(task.scePublicNumber)!,
    title: task.title,
    legacyScePublicReference: scePublicReferenceFromNumber(task.scePublicNumber),
    recordKindLabelKey: "sce.tenantPublicReference.recordKind.task",
  };
}