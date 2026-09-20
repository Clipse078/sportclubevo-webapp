/**
 * AUFGABEN-05-UI — cheap module / navigation capability (no full inbox load).
 */

import { prisma } from "@/lib/db/prisma";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { hasTaskPermission } from "@/lib/tasks/visibility";
import type { TaskServiceContext } from "@/lib/tasks/types";

export type PersonalActionsModuleCapabilities = {
  /** User may open Task Center management views (tasks.view). */
  taskManagement: boolean;
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
export async function resolvePersonalParticipationNavCapability(args: {
  tenantId: string;
  userId: string;
}): Promise<boolean> {
  const person = await prisma.person.findFirst({
    where: { userId: args.userId, tenantId: args.tenantId },
    select: { id: true },
  });
  if (!person) {
    return false;
  }

  const [guardianLinks, squadMemberships] = await Promise.all([
    prisma.guardianRelationship.count({
      where: { tenantId: args.tenantId, guardianPersonId: person.id },
    }),
    prisma.playerSquadMember.count({
      where: {
        personId: person.id,
        teamSeason: {
          status: "ACTIVE",
          team: { tenantId: args.tenantId },
        },
      },
    }),
  ]);

  return guardianLinks > 0 || squadMemberships > 0;
}

export function resolvePersonalActionsModuleCapabilities(input: {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
  participationNavCapable: boolean;
}): PersonalActionsModuleCapabilities {
  const taskCtx = taskContextFromKeys(input.tenantId, input.userId, input.permissionKeys);
  const taskManagement = hasTaskPermission(taskCtx, PERMISSIONS.TASKS_VIEW);
  const personalInbox = taskManagement || input.participationNavCapable;
  const moduleAccess = personalInbox;

  return {
    taskManagement,
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

  const participationNavCapable = await resolvePersonalParticipationNavCapability({
    tenantId: args.tenantId,
    userId: args.userId,
  });

  return {
    permissionKeys,
    ...resolvePersonalActionsModuleCapabilities({
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys,
      participationNavCapable,
    }),
  };
}
