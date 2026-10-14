/**
 * GET /api/clubs/selectable
 *
 * Lean Club Directory projection for the canonical SCE Club & Team Selector.
 * Same query semantics as GET /api/club-directory/clubs (/dashboard/vereine).
 */

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { createClubDirectoryQueryDatabase } from "@/lib/club-directory/prisma-adapter";
import {
  CLUB_DIRECTORY_DEFAULT_LIMIT,
  CLUB_DIRECTORY_MAX_LIMIT,
  countExternalClubs,
  listExternalClubs,
} from "@/lib/club-directory/query-service";
import { projectClubSummaryDtoToSelectable } from "@/lib/sce/club-team-selector/selectable-projection";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get("limit");
  const rawSkip = searchParams.get("skip");

  try {
    const database = createClubDirectoryQueryDatabase(prisma);
    const limit = rawLimit !== null ? parseInt(rawLimit, 10) : CLUB_DIRECTORY_DEFAULT_LIMIT;
    const skip = rawSkip !== null ? parseInt(rawSkip, 10) : 0;
    const listInput = {
      tenantId: tenant.id,
      search: searchParams.get("search") ?? undefined,
      includeArchived: searchParams.get("includeArchived") === "true",
      archivedOnly: searchParams.get("archivedOnly") === "true",
      limit,
      skip,
    };

    const [clubs, total] = await Promise.all([
      listExternalClubs(database, listInput),
      countExternalClubs(database, {
        tenantId: tenant.id,
        search: listInput.search,
        includeArchived: listInput.includeArchived,
        archivedOnly: listInput.archivedOnly,
      }),
    ]);

    return NextResponse.json({
      clubs: clubs.map(projectClubSummaryDtoToSelectable),
      meta: {
        total,
        limit,
        skip,
        hasMore: skip + clubs.length < total,
        maxLimit: CLUB_DIRECTORY_MAX_LIMIT,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
