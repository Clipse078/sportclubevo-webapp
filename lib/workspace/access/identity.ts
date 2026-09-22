/**
 * WORKSPACE-01 — Person vs User identity seam for Workspace ACL.
 *
 * Executable access requires authenticated actor resolution; grants are stored on Person.id.
 */

import type { ActorWorkspaceIdentity } from "@/lib/workspace/access/types";

export type PersonUserLookup = (
  tenantId: string,
  userId: string,
) => Promise<{ personId: string | null } | null>;

export type PersonByIdLookup = (
  tenantId: string,
  personId: string,
) => Promise<{ personId: string; userId: string | null } | null>;

/**
 * Maps session User → same-tenant Person.id when linked.
 * Returns null personId when no Person row exists (grant may still exist for future linking).
 */
export async function resolveActorWorkspaceIdentity(
  tenantId: string,
  userId: string,
  lookup: PersonUserLookup,
): Promise<ActorWorkspaceIdentity> {
  const row = await lookup(tenantId, userId);
  return {
    tenantId,
    userId,
    personId: row?.personId ?? null,
  };
}

/**
 * A Person grant is not consumable without an authenticated actor whose resolved personId matches.
 * Users from another tenant never match.
 */
export function actorMatchesPersonGrant(
  actor: ActorWorkspaceIdentity,
  grantPersonId: string,
): boolean {
  if (actor.personId == null) return false;
  return actor.personId === grantPersonId;
}

/**
 * createdByUserId records audit provenance only — never implies authorization.
 */
export function isCreatedByUserAuthorizationBypass(): false {
  return false;
}

export type PersonIdentitySemantics = {
  grantStorageIdentity: "Person.id";
  executableRequiresAuthenticatedActor: true;
  personWithoutUserCannotAuthenticate: true;
  crossTenantUserCannotConsumeGrant: true;
  unlinkRelinkDoesNotRewritePersonGrant: true;
};

export const WORKSPACE_PERSON_IDENTITY_SEMANTICS: PersonIdentitySemantics = {
  grantStorageIdentity: "Person.id",
  executableRequiresAuthenticatedActor: true,
  personWithoutUserCannotAuthenticate: true,
  crossTenantUserCannotConsumeGrant: true,
  unlinkRelinkDoesNotRewritePersonGrant: true,
};
