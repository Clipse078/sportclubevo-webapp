/**
 * AUFGABEN-05-UI — cheap module / navigation capability (no full inbox load).
 */

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { hasTaskPermission } from "@/lib/tasks/visibility";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { canAccessRequirementManagementFromKeys } from "@/lib/requirements/access";
import { countOpenRequirementObligationsForUser } from "./sources/requirement-obligations";

export type PersonalActionsModuleCapabilities = {
  /** User may open Task Center management views (tasks.view). */
  taskManagement: boolean;
  /** User may open Anforderungen management (requirements.* management permissions). */
  requirementManagement: boolean;
  /** User may use the personal Meine Aufgaben inbox (tasks and/or participation). */
  personalInbox: boolean;
  /** Aufgaben nav + route entry (task management and/or participation domain). */
  moduleAccess: boolean;
};

function taskContextFromKeys(
  tenantId: string,
  userId: string,
  permissionKeys: readonly string[],
): TaskServiceContext {
  return { tenantId, userId, permissionKeys: [...permissionKeys] };
}

/**
 * Lightweight participation-domain capability: linked person who is a guardian
 * and/or active squad player in the tenant. Does not load attendance obligations.
 */
export async function resolvePersonalParticipationNavCapabilityUncached(args: {
  tenantId: string;
  userId: string;
}): Promise<boolean> {
  // Single round-trip: linked tenant person + guardian and/or active squad probe.
  // Avoids Prisma Promise.all on two counts, which serializes on a single pg pool
  // connection and costs ~3× latency versus one EXISTS query.
  const rows = await prisma.$queryRaw<{ capable: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM "Person" p
      WHERE p."userId" = ${args.userId}
        AND p."tenantId" = ${args.tenantId}
        AND (
          EXISTS (
            SELECT 1
            FROM "GuardianRelationship" gr
            WHERE gr."tenantId" = ${args.tenantId}
              AND gr."guardianPersonId" = p."id"
          )
          OR EXISTS (
            SELECT 1
            FROM "PlayerSquadMember" psm
            INNER JOIN "TeamSeason" ts ON ts."id" = psm."teamSeasonId"
            INNER JOIN "Team" t ON t."id" = ts."teamId"
            WHERE psm."personId" = p."id"
              AND ts."status" = 'ACTIVE'::"TeamSeasonStatus"
              AND t."tenantId" = ${args.tenantId}
          )
        )
    ) AS capable
  `;
  return Boolean(rows[0]?.capable);
}

/** Request-scoped deduplication — shell layout may resolve this once per navigation. */
export const resolvePersonalParticipationNavCapability = cache(
  resolvePersonalParticipationNavCapabilityUncached,
);

/** User has at least one open Requirement obligation they may respond to (bounded count). */
export async function resolvePersonalRequirementNavCapability(args: {
  tenantId: string;
  userId: string;
}): Promise<boolean> {
  const count = await countOpenRequirementObligationsForUser(args.tenantId, args.userId);
  return count > 0;
}

export function resolvePersonalActionsModuleCapabilities(input: {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
  participationNavCapable: boolean;
  requirementRecipientCapable: boolean;
}): PersonalActionsModuleCapabilities {
  const taskCtx = taskContextFromKeys(input.tenantId, input.userId, input.permissionKeys);
  const taskManagement = hasTaskPermission(taskCtx, PERMISSIONS.TASKS_VIEW);
  const requirementManagement = canAccessRequirementManagementFromKeys(input.permissionKeys);
  const personalInbox =
    taskManagement || input.participationNavCapable || input.requirementRecipientCapable;
  const moduleAccess = personalInbox || requirementManagement;

  return {
    taskManagement,
    requirementManagement,
    personalInbox,
    moduleAccess,
  };
}

export async function loadPersonalActionsModuleCapabilities(args: {
  tenantId: string;
  userId: string;
  permissionKeys?: readonly string[];
}): Promise<PersonalActionsModuleCapabilities & { permissionKeys: string[] }> {
  let permissionKeys: string[];
  if (args.permissionKeys) {
    permissionKeys = [...args.permissionKeys];
  } else {
    const { platform, tenant } = await getRequestEffectivePermissions(
      args.userId,
      args.tenantId,
    );
    permissionKeys = [...platform, ...tenant];
  }

  const [participationNavCapable, requirementRecipientCapable] = await Promise.all([
    resolvePersonalParticipationNavCapability({
      tenantId: args.tenantId,
      userId: args.userId,
    }),
    resolvePersonalRequirementNavCapability({
      tenantId: args.tenantId,
      userId: args.userId,
    }),
  ]);

  return {
    permissionKeys,
    ...resolvePersonalActionsModuleCapabilities({
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys,
      participationNavCapable,
      requirementRecipientCapable,
    }),
  };
}
