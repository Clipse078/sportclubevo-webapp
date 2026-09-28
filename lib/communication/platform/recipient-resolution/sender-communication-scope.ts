/**
 * SCE-COMM-03 — Stage B: sender communication scope (authorization ≠ Zielgruppe).
 */

import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { SenderCommunicationScope } from "@/lib/communication/platform/authorization/communication-authorization";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import {
  resolveOrgUnitAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "@/lib/requirements/requirement-audience-resolvers";
import { sortPersonIds } from "@/lib/communication/platform/recipient-resolution/set-algebra";
import { resolveTeamIdForEventContextRef } from "@/lib/communication/event/event-participation-anchor";

async function loadAllActiveTenantPersonIds(tenantId: string): Promise<Set<string>> {
  const rows = await prisma.person.findMany({
    where: { tenantId, isActive: true },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

async function loadSenderScopedPersonIdsFromMembership(input: {
  tenantId: string;
  senderUserId: string;
}): Promise<Set<string>> {
  const { tenantId, senderUserId } = input;
  const memberships = await prisma.orgUnitMembership.findMany({
    where: {
      tenantId,
      userId: senderUserId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    select: { orgUnitId: true },
  });
  const teamTrainerRows = await prisma.trainerTeamMember.findMany({
    where: {
      status: "ACTIVE",
      person: { userId: senderUserId, tenantId, isActive: true },
      teamSeason: { status: "ACTIVE", team: { tenantId } },
    },
    select: { teamSeason: { select: { teamId: true } } },
  });

  const orgUnitIds = [...new Set(memberships.map((m) => m.orgUnitId))];
  const teamIds = [...new Set(teamTrainerRows.map((r) => r.teamSeason.teamId))];

  const parts: string[][] = [];
  if (orgUnitIds.length > 0) {
    parts.push(await resolveOrgUnitAudiencePersonIds(tenantId, orgUnitIds));
  }
  if (teamIds.length > 0) {
    parts.push(await resolveTeamAudiencePersonIds(tenantId, teamIds));
  }

  const selfPerson = await prisma.person.findFirst({
    where: { tenantId, userId: senderUserId, isActive: true },
    select: { id: true },
  });
  const scoped = new Set<string>();
  for (const id of parts.flat()) scoped.add(id);
  if (selfPerson) scoped.add(selfPerson.id);
  return scoped;
}

export type SenderScopeResolution = {
  scope: SenderCommunicationScope;
  /** True when preview scope is narrower than organisation-wide manage rights. */
  previewScopeLimited: boolean;
};

/**
 * Canonical sender scope adapter. Defaults fail-closed (empty scope) when
 * permission dimensions are not yet fully modelled for communication sends.
 */
export async function resolveSenderCommunicationScope(input: {
  tenantId: string;
  senderUserId: string;
  context: CommunicationContextRef;
}): Promise<SenderScopeResolution> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant } = await resolver.getEffectivePermissions({
    userId: input.senderUserId,
    tenantId: input.tenantId,
  });

  const canManageZielgruppen = tenant.includes(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE);
  const canSendClub = tenant.includes(PERMISSIONS.COMMUNICATION_CLUB_SEND);

  const isOrganisationContext =
    input.context.kind === "ORGANISATION" || input.context.kind === "ORG_UNIT";

  if (input.context.kind === "DIRECT") {
    const canSendTeam = tenant.includes(PERMISSIONS.COMMUNICATION_TEAM_SEND);
    if (canSendClub) {
      const all = await loadAllActiveTenantPersonIds(input.tenantId);
      return {
        scope: {
          tenantId: input.tenantId,
          senderUserId: input.senderUserId,
          allowedSubjectPersonIds: all,
        },
        previewScopeLimited: false,
      };
    }
    if (canSendTeam) {
      const membershipScoped = await loadSenderScopedPersonIdsFromMembership({
        tenantId: input.tenantId,
        senderUserId: input.senderUserId,
      });
      return {
        scope: {
          tenantId: input.tenantId,
          senderUserId: input.senderUserId,
          allowedSubjectPersonIds: membershipScoped,
        },
        previewScopeLimited: true,
      };
    }
    return {
      scope: {
        tenantId: input.tenantId,
        senderUserId: input.senderUserId,
        allowedSubjectPersonIds: new Set<string>(),
      },
      previewScopeLimited: true,
    };
  }

  if (isOrganisationContext) {
    if (canSendClub) {
      const all = await loadAllActiveTenantPersonIds(input.tenantId);
      return {
        scope: {
          tenantId: input.tenantId,
          senderUserId: input.senderUserId,
          allowedSubjectPersonIds: all,
        },
        previewScopeLimited: false,
      };
    }
    const membershipScoped = await loadSenderScopedPersonIdsFromMembership({
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
    });
    return {
      scope: {
        tenantId: input.tenantId,
        senderUserId: input.senderUserId,
        allowedSubjectPersonIds: membershipScoped,
      },
      previewScopeLimited: true,
    };
  }

  if (canManageZielgruppen) {
    const all = await loadAllActiveTenantPersonIds(input.tenantId);
    return {
      scope: {
        tenantId: input.tenantId,
        senderUserId: input.senderUserId,
        allowedSubjectPersonIds: all,
      },
      previewScopeLimited: false,
    };
  }

  if (input.context.kind === "TEAM") {
    const teamPersonIds = await resolveTeamAudiencePersonIds(input.tenantId, [input.context.teamId]);
    return {
      scope: {
        tenantId: input.tenantId,
        senderUserId: input.senderUserId,
        allowedSubjectPersonIds: new Set(sortPersonIds(teamPersonIds)),
      },
      previewScopeLimited: true,
    };
  }

  if (input.context.kind === "EVENT") {
    const teamId = await resolveTeamIdForEventContextRef({
      tenantId: input.tenantId,
      contextEventId: input.context.eventId,
    });
    if (teamId) {
      const teamPersonIds = await resolveTeamAudiencePersonIds(input.tenantId, [teamId]);
      return {
        scope: {
          tenantId: input.tenantId,
          senderUserId: input.senderUserId,
          allowedSubjectPersonIds: new Set(sortPersonIds(teamPersonIds)),
        },
        previewScopeLimited: true,
      };
    }
  }

  const membershipScoped = await loadSenderScopedPersonIdsFromMembership({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
  });

  return {
    scope: {
      tenantId: input.tenantId,
      senderUserId: input.senderUserId,
      allowedSubjectPersonIds: membershipScoped,
    },
    previewScopeLimited: true,
  };
}
