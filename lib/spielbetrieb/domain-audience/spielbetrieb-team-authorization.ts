/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — team-scoped discovery/materialization gates.
 */

import { prisma } from "@/lib/db/prisma";
import { resolveTeamCommunicationAuthorization } from "@/lib/communication/team/team-communication-authorization";
import { listTeamIdsWithTeamCommunicationView } from "@/lib/communication/team/team-communication-authorization-scope";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

export async function resolveTenantKey(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: { key: true },
  });
  if (!tenant?.key) {
    throw new Error("Tenant not found.");
  }
  return tenant.key;
}

export async function assertSpielbetriebTeamCommunicationView(input: {
  tenantId: string;
  userId: string;
  teamId: string;
}): Promise<void> {
  const tenantKey = await resolveTenantKey(input.tenantId);
  const auth = await resolveTeamCommunicationAuthorization({
    tenantId: input.tenantId,
    tenantKey,
    userId: input.userId,
    teamId: input.teamId,
  });
  if (!auth?.canView) {
    throw new TeamCommunicationForbiddenError("SPIELBETRIEB_AUDIENCE_VIEW_DENIED");
  }
}

export async function assertSpielbetriebTeamCommunicationSend(input: {
  tenantId: string;
  userId: string;
  teamId: string;
}): Promise<void> {
  const tenantKey = await resolveTenantKey(input.tenantId);
  const auth = await resolveTeamCommunicationAuthorization({
    tenantId: input.tenantId,
    tenantKey,
    userId: input.userId,
    teamId: input.teamId,
  });
  if (!auth?.canSend) {
    throw new TeamCommunicationForbiddenError("SPIELBETRIEB_AUDIENCE_SEND_DENIED");
  }
}

export async function listTeamIdsWithSpielbetriebAudienceView(input: {
  tenantId: string;
  userId: string;
}): Promise<string[]> {
  return listTeamIdsWithTeamCommunicationView(input);
}
