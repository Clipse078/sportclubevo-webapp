/**
 * SCE-COMM-04 — Team conversation anchor + context helpers.
 *
 * Conversation anchor: stable Team.id (PlatformCommunicationConversation.teamId).
 * Audience membership: active TeamSeason roster at dispatch time (COMM-03 structural teamIds).
 */

import { prisma } from "@/lib/db/prisma";
import type { PlatformCommunicationConversationKind } from "@prisma/client";
import {
  createTeamCommunicationContext,
  type TeamConversationAnchor,
} from "@/lib/communication/platform/seams/team-communication-seam";

export { createTeamCommunicationContext };

export function buildTeamConversationAnchor(input: {
  tenantId: string;
  teamId: string;
  threadKind?: TeamConversationAnchor["threadKind"];
  namedThreadSlug?: string;
}): TeamConversationAnchor {
  return {
    tenantId: input.tenantId,
    teamId: input.teamId.trim(),
    threadKind: input.threadKind ?? "TEAM_GENERAL",
    namedThreadSlug: input.namedThreadSlug?.trim() || undefined,
  };
}

export async function getOrCreateTeamCommunicationConversation(input: {
  tenantId: string;
  teamId: string;
  conversationKind?: PlatformCommunicationConversationKind;
  namedThreadSlug?: string;
}) {
  const team = await prisma.team.findFirst({
    where: { id: input.teamId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!team) return null;

  const conversationKind = input.conversationKind ?? "TEAM_GENERAL";
  const namedThreadSlug = input.namedThreadSlug?.trim() ?? "";

  return prisma.platformCommunicationConversation.upsert({
    where: {
      tenantId_contextKind_teamId_conversationKind_namedThreadSlug: {
        tenantId: input.tenantId,
        contextKind: "TEAM",
        teamId: input.teamId,
        conversationKind,
        namedThreadSlug,
      },
    },
    create: {
      tenantId: input.tenantId,
      contextKind: "TEAM",
      teamId: input.teamId,
      conversationKind,
      namedThreadSlug,
    },
    update: {},
  });
}
