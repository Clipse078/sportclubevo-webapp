/**
 * SCE-COMM-04 — Team communication authorization (separate from team membership).
 */

import { prisma } from "@/lib/db/prisma";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import {
  getTeamCommunicationAuthorizationScope,
  resolveTeamCommunicationFromScope,
} from "@/lib/communication/team/team-communication-authorization-scope";

export type TeamCommunicationAuthorization = {
  tenantId: string;
  tenantKey: string;
  userId: string;
  teamId: string;
  canView: boolean;
  canSend: boolean;
};

export type ResolveTeamCommunicationAuthorizationInput = {
  tenantId: string;
  tenantKey: string;
  userId: string;
  teamId: string;
};

export async function resolveTeamCommunicationAuthorization(
  input: ResolveTeamCommunicationAuthorizationInput,
): Promise<TeamCommunicationAuthorization | null> {
  const scope = await getTeamCommunicationAuthorizationScope(input.tenantId, input.userId);
  if (scope.tenantKey !== input.tenantKey) {
    return null;
  }
  const resolved = resolveTeamCommunicationFromScope(scope, input.teamId);
  if (!resolved) return null;

  return {
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    teamId: input.teamId,
    canView: resolved.canView,
    canSend: resolved.canSend,
  };
}

export async function requireTeamCommunicationView(
  input: ResolveTeamCommunicationAuthorizationInput,
): Promise<TeamCommunicationAuthorization> {
  const auth = await resolveTeamCommunicationAuthorization(input);
  if (!auth?.canView) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_VIEW_DENIED");
  }
  return auth;
}

export async function requireTeamCommunicationSend(
  input: ResolveTeamCommunicationAuthorizationInput,
): Promise<TeamCommunicationAuthorization> {
  const auth = await resolveTeamCommunicationAuthorization(input);
  if (!auth?.canSend) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED");
  }
  return auth;
}
