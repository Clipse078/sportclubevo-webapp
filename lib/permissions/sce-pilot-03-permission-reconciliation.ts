/**
 * SCE-PILOT-03 — permission catalog rows for allocation-only and read-only CMS keys.
 * CLI: scripts/sync-sce-pilot-03-permissions.ts
 */

import type { PermissionModule, PrismaClient } from "@prisma/client";

const TRAINING_MODULE = "TRAININGS" as PermissionModule;
const NEWS_MODULE = "NEWS" as PermissionModule;
const WEBSITE_MODULE = "WEBSITE" as PermissionModule;
const INFOBOARD_MODULE = "INFOBOARD" as PermissionModule;

export const SCE_PILOT_03_PERMISSION_DEFS = [
  {
    key: "planning.allocations.view",
    name: "View planning allocations",
    module: TRAINING_MODULE,
  },
  {
    key: "planning.allocations.manage",
    name: "Manage planning allocations",
    module: TRAINING_MODULE,
  },
  { key: "news.view", name: "View published news", module: NEWS_MODULE },
  { key: "website.view", name: "View website content", module: WEBSITE_MODULE },
  { key: "infoboard.view", name: "View infoboard preview", module: INFOBOARD_MODULE },
] as const;

export type PermissionSyncOutcome =
  | { action: "created"; key: string }
  | { action: "already_exists"; key: string }
  | { action: "updated"; key: string };

export type Pilot03ReconciliationResult = {
  permissions: PermissionSyncOutcome[];
};

export async function reconcileScePilot03Permissions(
  prisma: PrismaClient,
  dryRun = false,
): Promise<Pilot03ReconciliationResult> {
  const permissionOutcomes: PermissionSyncOutcome[] = [];

  for (const def of SCE_PILOT_03_PERMISSION_DEFS) {
    const existing = await prisma.permission.findUnique({
      where: { key: def.key },
      select: { id: true, name: true, module: true },
    });

    if (existing) {
      const needsUpdate = existing.name !== def.name || existing.module !== def.module;
      permissionOutcomes.push({ action: needsUpdate ? "updated" : "already_exists", key: def.key });
    } else {
      permissionOutcomes.push({ action: "created", key: def.key });
    }

    if (!dryRun) {
      await prisma.permission.upsert({
        where: { key: def.key },
        update: { name: def.name, module: def.module },
        create: { key: def.key, name: def.name, module: def.module },
      });
    }
  }

  return { permissions: permissionOutcomes };
}
