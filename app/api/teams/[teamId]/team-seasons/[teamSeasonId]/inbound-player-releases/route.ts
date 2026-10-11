import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { acknowledgeInboundPlayerReleaseAwarenessNotifications } from "@/lib/match-squad/player-release-awareness-producer";
import { listInboundTargetedPlayerReleases } from "@/lib/match-squad/player-release-target-awareness-service";
import {
  mapPlayerReleaseRouteError,
  resolveInboundPlayerReleaseRouteAccess,
} from "@/lib/match-squad/player-release-route-access";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

async function assertTeamSeasonBelongsToTeam(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
}): Promise<boolean> {
  const row = await prisma.teamSeason.findFirst({
    where: {
      id: input.teamSeasonId,
      teamId: input.teamId,
      team: { tenantId: input.tenantId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function GET(_request: NextRequest, context: Context) {
  const { teamId, teamSeasonId } = await context.params;
  const resolved = await resolveInboundPlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  try {
    const belongs = await assertTeamSeasonBelongsToTeam({
      tenantId: resolved.tenant.id,
      teamId,
      teamSeasonId,
    });
    if (!belongs) {
      return NextResponse.json({ error: "Team nicht gefunden." }, { status: 404 });
    }

    const releases = await listInboundTargetedPlayerReleases({
      tenantId: resolved.tenant.id,
      targetTeamSeasonId: teamSeasonId,
      timezone: resolved.tenant.timezone ?? "Europe/Zurich",
    });

    return NextResponse.json({
      actionableCount: releases.length,
      releases,
    });
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}

export async function POST(_request: NextRequest, context: Context) {
  const { teamId, teamSeasonId } = await context.params;
  const resolved = await resolveInboundPlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  try {
    const belongs = await assertTeamSeasonBelongsToTeam({
      tenantId: resolved.tenant.id,
      teamId,
      teamSeasonId,
    });
    if (!belongs) {
      return NextResponse.json({ error: "Team nicht gefunden." }, { status: 404 });
    }

    const markedRead = await acknowledgeInboundPlayerReleaseAwarenessNotifications({
      tenantId: resolved.tenant.id,
      userId: resolved.userId,
      targetTeamId: teamId,
    });

    return NextResponse.json({ markedRead });
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}
