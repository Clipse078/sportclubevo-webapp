import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  WORKSPACE_DEFAULT_TRASH_RETENTION_DAYS,
  normalizeTrashRetentionDays,
} from "@/lib/workspace/governance/retention-constants";

type RetentionClient = Pick<
  PrismaClient,
  "workspaceTrashRetentionPolicy"
>;

export async function resolveWorkspaceTrashRetentionDays(
  client: RetentionClient,
  tenantId: string,
): Promise<number> {
  const row = await client.workspaceTrashRetentionPolicy.findUnique({
    where: { tenantId },
    select: { trashRetentionDays: true },
  });
  if (!row) {
    return WORKSPACE_DEFAULT_TRASH_RETENTION_DAYS;
  }
  return row.trashRetentionDays;
}

export async function upsertWorkspaceTrashRetentionPolicy(input: {
  tenantId: string;
  trashRetentionDays: number;
}): Promise<{ trashRetentionDays: number }> {
  const days = normalizeTrashRetentionDays(input.trashRetentionDays);
  if (days === null) {
    throw new Error("Invalid trash retention days.");
  }

  const row = await prisma.workspaceTrashRetentionPolicy.upsert({
    where: { tenantId: input.tenantId },
    create: {
      tenantId: input.tenantId,
      trashRetentionDays: days,
    },
    update: { trashRetentionDays: days },
    select: { trashRetentionDays: true },
  });

  return { trashRetentionDays: row.trashRetentionDays };
}

export type TrashRetentionPolicyWriter = Pick<
  Prisma.TransactionClient,
  "workspaceTrashRetentionPolicy"
>;
