/**
 * AUFGABEN-06F2-UX1-A2 — Task visibility access grants (org units / viewer users).
 */

import type { Prisma } from "@prisma/client";
import {
  TaskAccessGrantSubjectType,
  TaskVisibilityScope,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TaskValidationError } from "./errors";
import { assertEligibleTaskOrgUnitForNewOwnership } from "./task-org-mutation-policy";

export type TaskAccessGrantSnapshot = {
  orgUnitIds: readonly string[];
  viewerUserIds: readonly string[];
};

export type TaskAccessGrantMutationInput = {
  visibilityScope: TaskVisibilityScope;
  orgUnitGrantIds?: readonly string[];
  viewerUserGrantIds?: readonly string[];
};

export function emptyTaskAccessGrantSnapshot(): TaskAccessGrantSnapshot {
  return { orgUnitIds: [], viewerUserIds: [] };
}

export async function loadTaskAccessGrantSnapshot(
  tenantId: string,
  taskId: string,
): Promise<TaskAccessGrantSnapshot> {
  if (!prisma.taskAccessGrant) {
    return emptyTaskAccessGrantSnapshot();
  }
  const rows = await prisma.taskAccessGrant.findMany({
    where: { tenantId, taskId },
    select: { subjectType: true, orgUnitId: true, userId: true },
  });
  return grantsRowsToSnapshot(rows);
}

export async function loadTaskSeriesAccessGrantSnapshot(
  tenantId: string,
  seriesId: string,
): Promise<TaskAccessGrantSnapshot> {
  if (!prisma.taskSeriesAccessGrant) {
    return emptyTaskAccessGrantSnapshot();
  }
  const rows = await prisma.taskSeriesAccessGrant.findMany({
    where: { tenantId, seriesId },
    select: { subjectType: true, orgUnitId: true, userId: true },
  });
  return grantsRowsToSnapshot(rows);
}

export function grantsRowsToSnapshot(
  rows: readonly {
    subjectType: TaskAccessGrantSubjectType;
    orgUnitId: string | null;
    userId: string | null;
  }[],
): TaskAccessGrantSnapshot {
  const orgUnitIds: string[] = [];
  const viewerUserIds: string[] = [];
  for (const row of rows) {
    if (row.subjectType === TaskAccessGrantSubjectType.ORG_UNIT && row.orgUnitId) {
      orgUnitIds.push(row.orgUnitId);
    }
    if (row.subjectType === TaskAccessGrantSubjectType.USER && row.userId) {
      viewerUserIds.push(row.userId);
    }
  }
  return {
    orgUnitIds: [...new Set(orgUnitIds)],
    viewerUserIds: [...new Set(viewerUserIds)],
  };
}

export function resolveEffectiveOrgUnitGrantIds(
  visibilityScope: TaskVisibilityScope,
  orgUnitId: string | null,
  snapshot: TaskAccessGrantSnapshot,
): string[] {
  if (visibilityScope !== TaskVisibilityScope.ORG_UNIT) return [];
  if (snapshot.orgUnitIds.length > 0) return [...snapshot.orgUnitIds];
  return orgUnitId ? [orgUnitId] : [];
}

export async function validateTaskAccessGrantMutation(
  tenantId: string,
  input: TaskAccessGrantMutationInput,
): Promise<TaskAccessGrantSnapshot> {
  const orgUnitGrantIds = [...new Set(input.orgUnitGrantIds ?? [])];
  const viewerUserGrantIds = [...new Set(input.viewerUserGrantIds ?? [])];

  if (input.visibilityScope === TaskVisibilityScope.ORG_UNIT) {
    if (orgUnitGrantIds.length === 0) {
      throw new TaskValidationError(
        "Für Sichtbarkeit «Organisationseinheiten» ist mindestens eine Organisationseinheit erforderlich.",
      );
    }
    for (const orgUnitId of orgUnitGrantIds) {
      await assertEligibleTaskOrgUnitForNewOwnership(tenantId, orgUnitId);
    }
    return { orgUnitIds: orgUnitGrantIds, viewerUserIds: [] };
  }

  if (input.visibilityScope === TaskVisibilityScope.ASSIGNEES_ONLY) {
    if (viewerUserGrantIds.length > 0) {
      await validateViewerUserGrantIds(tenantId, viewerUserGrantIds);
    }
    return { orgUnitIds: [], viewerUserIds: viewerUserGrantIds };
  }

  return emptyTaskAccessGrantSnapshot();
}

async function validateViewerUserGrantIds(
  tenantId: string,
  userIds: string[],
): Promise<void> {
  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      userId: { in: userIds },
      isActive: true,
      user: { isActive: true },
    },
    select: { userId: true },
  });
  if (memberships.length !== userIds.length) {
    throw new TaskValidationError(
      "Eine oder mehrere ausgewählte Personen sind in diesem Verein nicht verfügbar.",
    );
  }
}

function taskGrantClient(tx: Prisma.TransactionClient) {
  return (tx as Prisma.TransactionClient & {
    taskAccessGrant?: Prisma.TaskAccessGrantDelegate;
  }).taskAccessGrant;
}

function seriesGrantClient(tx: Prisma.TransactionClient) {
  return (tx as Prisma.TransactionClient & {
    taskSeriesAccessGrant?: Prisma.TaskSeriesAccessGrantDelegate;
  }).taskSeriesAccessGrant;
}

export async function replaceTaskAccessGrants(
  tx: Prisma.TransactionClient,
  tenantId: string,
  taskId: string,
  visibilityScope: TaskVisibilityScope,
  snapshot: TaskAccessGrantSnapshot,
): Promise<void> {
  const grants = taskGrantClient(tx);
  if (!grants) return;

  await grants.deleteMany({ where: { tenantId, taskId } });

  if (visibilityScope === TaskVisibilityScope.ORG_UNIT && snapshot.orgUnitIds.length > 0) {
    await grants.createMany({
      data: snapshot.orgUnitIds.map((orgUnitId) => ({
        tenantId,
        taskId,
        subjectType: TaskAccessGrantSubjectType.ORG_UNIT,
        orgUnitId,
        userId: null,
      })),
    });
  }

  if (
    visibilityScope === TaskVisibilityScope.ASSIGNEES_ONLY &&
    snapshot.viewerUserIds.length > 0
  ) {
    await grants.createMany({
      data: snapshot.viewerUserIds.map((userId) => ({
        tenantId,
        taskId,
        subjectType: TaskAccessGrantSubjectType.USER,
        orgUnitId: null,
        userId,
      })),
    });
  }
}

export async function replaceTaskSeriesAccessGrants(
  tx: Prisma.TransactionClient,
  tenantId: string,
  seriesId: string,
  visibilityScope: TaskVisibilityScope,
  snapshot: TaskAccessGrantSnapshot,
): Promise<void> {
  const grants = seriesGrantClient(tx);
  if (!grants) return;

  await grants.deleteMany({ where: { tenantId, seriesId } });

  if (visibilityScope === TaskVisibilityScope.ORG_UNIT && snapshot.orgUnitIds.length > 0) {
    await grants.createMany({
      data: snapshot.orgUnitIds.map((orgUnitId) => ({
        tenantId,
        seriesId,
        subjectType: TaskAccessGrantSubjectType.ORG_UNIT,
        orgUnitId,
        userId: null,
      })),
    });
  }

  if (
    visibilityScope === TaskVisibilityScope.ASSIGNEES_ONLY &&
    snapshot.viewerUserIds.length > 0
  ) {
    await grants.createMany({
      data: snapshot.viewerUserIds.map((userId) => ({
        tenantId,
        seriesId,
        subjectType: TaskAccessGrantSubjectType.USER,
        orgUnitId: null,
        userId,
      })),
    });
  }
}

export async function snapshotTaskAccessGrantsToChild(
  tx: Prisma.TransactionClient,
  tenantId: string,
  parentTaskId: string,
  childTaskId: string,
  visibilityScope: TaskVisibilityScope,
): Promise<void> {
  const grantClient = taskGrantClient(tx);
  if (!grantClient) return;

  const parentGrants = await grantClient.findMany({
    where: { tenantId, taskId: parentTaskId },
    select: { subjectType: true, orgUnitId: true, userId: true },
  });
  const snapshot = grantsRowsToSnapshot(parentGrants);
  await replaceTaskAccessGrants(tx, tenantId, childTaskId, visibilityScope, snapshot);
}

export async function snapshotSeriesAccessGrantsToOccurrence(
  tx: Prisma.TransactionClient,
  tenantId: string,
  seriesId: string,
  taskId: string,
  visibilityScope: TaskVisibilityScope,
): Promise<void> {
  const grantClient = seriesGrantClient(tx);
  if (!grantClient) return;

  const seriesGrants = await grantClient.findMany({
    where: { tenantId, seriesId },
    select: { subjectType: true, orgUnitId: true, userId: true },
  });
  const snapshot = grantsRowsToSnapshot(seriesGrants);
  await replaceTaskAccessGrants(tx, tenantId, taskId, visibilityScope, snapshot);
}

export function parseIdListFromForm(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}
