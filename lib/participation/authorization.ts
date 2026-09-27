/**
 * lib/participation/authorization.ts
 *
 * TEAM-COCKPIT-03A — actor authorization for participation responses.
 *
 * Never trusts client-supplied tenantId or arbitrary personId.
 * Derives allowed person scope from authenticated user relationships.
 */

import { prisma } from "@/lib/db/prisma";
import type { ParticipationResponseSource } from "@prisma/client";
import { ParticipationUnauthorizedError } from "./errors";
import { collectUserIdsAuthorizedToRespondForSubjectPerson } from "./subject-responder-users";
import { loadTenantCommunicationSafeguardingPolicy } from "@/lib/communication/platform/safeguarding/tenant-safeguarding-policy";
import { isPersonMinorUnderTenantPolicy } from "@/lib/communication/platform/safeguarding/subject-age-policy";

export type ParticipationActorContext = {
  source: ParticipationResponseSource;
  actorPersonId: string | null;
};

/**
 * Resolves whether an authenticated user may respond for a given player.
 * Fails closed when no valid player/parent relationship exists.
 */
export async function assertActorCanRespondForPerson(
  tenantId: string,
  actorUserId: string,
  personId: string,
): Promise<ParticipationActorContext> {
  const actorPerson = await prisma.person.findFirst({
    where: { userId: actorUserId, tenantId },
    select: { id: true },
  });

  if (actorPerson?.id === personId) {
    return { source: "PLAYER", actorPersonId: actorPerson.id };
  }

  if (actorPerson) {
    const guardianLink = await prisma.guardianRelationship.findFirst({
      where: {
        tenantId,
        childPersonId: personId,
        guardianPersonId: actorPerson.id,
      },
      select: { id: true },
    });

    if (guardianLink) {
      const child = await prisma.person.findFirst({
        where: { id: personId, tenantId },
        select: { dateOfBirth: true, userId: true },
      });
      const policy = await loadTenantCommunicationSafeguardingPolicy(tenantId);
      const isMinor =
        child &&
        policy.safeguardingEnabled &&
        isPersonMinorUnderTenantPolicy({
          dateOfBirth: child.dateOfBirth,
          minorAgeThresholdYears: policy.minorAgeThresholdYears,
          referenceDate: new Date(),
        });
      if (isMinor && !policy.guardianResponseAuthorityEnabled) {
        throw new ParticipationUnauthorizedError();
      }
      return { source: "PARENT", actorPersonId: actorPerson.id };
    }
  }

  throw new ParticipationUnauthorizedError();
}

/**
 * Returns person IDs the authenticated user may respond for (self + guardian children).
 */
export async function getAuthorizedPersonIdsForUser(
  tenantId: string,
  actorUserId: string,
): Promise<string[]> {
  const actorPerson = await prisma.person.findFirst({
    where: { userId: actorUserId, tenantId },
    select: { id: true },
  });

  if (!actorPerson) {
    return [];
  }

  const guardianChildren = await prisma.guardianRelationship.findMany({
    where: {
      tenantId,
      guardianPersonId: actorPerson.id,
    },
    select: { childPersonId: true },
  });

  const personIds = new Set<string>([actorPerson.id]);
  for (const link of guardianChildren) {
    personIds.add(link.childPersonId);
  }

  return [...personIds];
}

/**
 * Inverse of getAuthorizedPersonIdsForUser — users who may respond for a player (self + guardians).
 */
export async function getUserIdsAuthorizedToRespondForPerson(
  tenantId: string,
  personId: string,
): Promise<string[]> {
  const person = await prisma.person.findFirst({
    where: { id: personId, tenantId },
    select: {
      userId: true,
      guardianRelationshipsAsChild: {
        select: { guardianPerson: { select: { userId: true } } },
      },
    },
  });

  if (!person) return [];

  return collectUserIdsAuthorizedToRespondForSubjectPerson(person);
}
