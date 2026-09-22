/**
 * WORKSPACE-02 — canonical session → workspace actor resolution.
 */

import { prisma } from "@/lib/db/prisma";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { resolveActorWorkspaceIdentity } from "@/lib/workspace/access/identity";
import {
  createWorkspaceActorContext,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";

async function lookupPersonForUser(
  tenantId: string,
  userId: string,
): Promise<{ personId: string | null } | null> {
  const person = await prisma.person.findFirst({
    where: { tenantId, userId },
    select: { id: true },
  });

  return { personId: person?.id ?? null };
}

export async function resolveWorkspaceActor(input: {
  tenantId: string;
  userId: string;
  permissionKeys?: readonly string[];
}): Promise<WorkspaceActorContext> {
  const identity = await resolveActorWorkspaceIdentity(
    input.tenantId,
    input.userId,
    lookupPersonForUser,
  );

  let permissionKeys = input.permissionKeys;
  if (!permissionKeys) {
    const effective = await getRequestEffectivePermissions(
      input.userId,
      input.tenantId,
    );
    permissionKeys = [...effective.platform, ...effective.tenant];
  }

  return createWorkspaceActorContext({
    tenantId: input.tenantId,
    userId: input.userId,
    personId: identity.personId,
    permissionKeys,
  });
}

export async function resolveWorkspaceActorFromSessionUser(input: {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
}): Promise<WorkspaceActorContext> {
  return resolveWorkspaceActor(input);
}
