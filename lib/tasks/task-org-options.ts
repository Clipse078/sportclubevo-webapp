/**
 * AUFGABEN-05-ORG-03 — authorization-aware OrgUnit options for Tasks UX.
 */

import { prisma } from "@/lib/db/prisma";
import {
  buildTaskReadWhere,
  hasTenantWideClubTaskRead,
  orgReadableUnitIds,
} from "./visibility";
import type { TaskServiceContext } from "./types";
import { canAssignTaskOrgUnit, hasTenantWideTaskManage } from "./task-org-mutation-policy";

export type TaskOrgUnitPickerOption = {
  id: string;
  label: string;
  parentId: string | null;
  level: number;
};

export type TaskOrgUnitPresentation = {
  label: string;
  archived: boolean;
  missing: boolean;
};

export async function loadTaskOrgUnitMutationOptions(
  ctx: TaskServiceContext,
): Promise<TaskOrgUnitPickerOption[]> {
  const units = await prisma.orgUnit.findMany({
    where: { tenantId: ctx.tenantId, status: { not: "ARCHIVED" } },
    select: { id: true, name: true, parentId: true, level: true, sortOrder: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return units
    .filter((unit) => canAssignTaskOrgUnit(ctx, unit.id))
    .map((unit) => ({
      id: unit.id,
      label: unit.name,
      parentId: unit.parentId,
      level: unit.level,
    }));
}

export async function loadTaskOrgUnitFilterOptions(
  ctx: TaskServiceContext,
): Promise<TaskOrgUnitPickerOption[]> {
  const auth = ctx.auth ?? {
    memberOrgUnitIds: [],
    permissionReadOrgUnitIds: [],
    permissionManageOrgUnitIds: [],
  };

  const activeUnits = await prisma.orgUnit.findMany({
    where: { tenantId: ctx.tenantId, status: { not: "ARCHIVED" } },
    select: { id: true, name: true, parentId: true, level: true, sortOrder: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const allowedActive = new Set<string>();
  if (hasTenantWideClubTaskRead(ctx) || hasTenantWideTaskManage(ctx)) {
    for (const unit of activeUnits) {
      allowedActive.add(unit.id);
    }
  } else {
    for (const id of orgReadableUnitIds(auth)) {
      allowedActive.add(id);
    }
    for (const id of auth.permissionManageOrgUnitIds) {
      allowedActive.add(id);
    }
  }

  const historicalRows = await prisma.task.findMany({
    where: {
      AND: [
        buildTaskReadWhere(ctx),
        { orgUnitId: { not: null } },
        { orgUnit: { status: "ARCHIVED" } },
      ],
    },
    select: {
      orgUnitId: true,
      orgUnit: { select: { id: true, name: true, parentId: true, level: true } },
    },
    distinct: ["orgUnitId"],
  });

  const byId = new Map<string, TaskOrgUnitPickerOption>();

  for (const unit of activeUnits) {
    if (!allowedActive.has(unit.id)) continue;
    byId.set(unit.id, {
      id: unit.id,
      label: unit.name,
      parentId: unit.parentId,
      level: unit.level,
    });
  }

  for (const row of historicalRows) {
    if (!row.orgUnitId || !row.orgUnit) continue;
    if (byId.has(row.orgUnitId)) continue;
    byId.set(row.orgUnitId, {
      id: row.orgUnit.id,
      label: `${row.orgUnit.name} · Archiviert`,
      parentId: row.orgUnit.parentId,
      level: row.orgUnit.level,
    });
  }

  return [...byId.values()].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.label.localeCompare(b.label, "de");
  });
}

export async function resolveTaskOrgUnitPresentationBatch(
  tenantId: string,
  orgUnitIds: readonly string[],
): Promise<Map<string, TaskOrgUnitPresentation>> {
  const unique = [...new Set(orgUnitIds.filter(Boolean))];
  const map = new Map<string, TaskOrgUnitPresentation>();
  if (unique.length === 0) return map;

  const rows =
    (await prisma.orgUnit.findMany({
      where: { tenantId, id: { in: unique } },
      select: { id: true, name: true, status: true },
    })) ?? [];

  const found = new Set<string>();
  for (const row of rows) {
    found.add(row.id);
    map.set(row.id, {
      label: row.name,
      archived: row.status === "ARCHIVED",
      missing: false,
    });
  }

  for (const id of unique) {
    if (!found.has(id)) {
      map.set(id, {
        label: "Organisationseinheit nicht mehr verfügbar",
        archived: true,
        missing: true,
      });
    }
  }

  return map;
}
