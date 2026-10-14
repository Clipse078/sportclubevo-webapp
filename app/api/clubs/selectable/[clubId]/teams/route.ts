import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { createClubDirectoryQueryDatabase } from "@/lib/club-directory/prisma-adapter";
import {
  CLUB_DIRECTORY_DEFAULT_LIMIT,
  listExternalTeams,
} from "@/lib/club-directory/query-service";
import { projectTeamSummaryDtoToSelectable } from "@/lib/sce/club-team-selector/selectable-projection";

type RouteContext = { params: Promise<{ clubId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenant = await getTenantFromSession(access.session.user?.activeTenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Standard-Tenant nicht gefunden." }, { status: 500 });
  }

  const { clubId } = await params;

  try {
    const database = createClubDirectoryQueryDatabase(prisma);
    const teams = await listExternalTeams(database, {
      tenantId: tenant.id,
      externalClubId: clubId,
      limit: CLUB_DIRECTORY_DEFAULT_LIMIT,
      skip: 0,
    });

    return NextResponse.json({
      teams: teams.map((team) => {
        const projected = projectTeamSummaryDtoToSelectable(team);
        return {
          ...projected,
          ageGroup: null,
          genderGroup: null,
        };
      }),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Teams konnten nicht geladen werden." }, { status: 500 });
  }
}
