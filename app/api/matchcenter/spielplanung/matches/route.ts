import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  listMatchcenterMatchesPage,
  type MatchcenterQueryDatabase,
} from "@/lib/matchcenter/query-service";
import {
  resolveMatchcenterSpielplanScheduleScope,
  resolveMatchcenterSpielplanungQueryWindow,
  type MatchcenterSeasonScope,
} from "@/lib/matchcenter/spielplan-schedule-scope";
import { MATCHCENTER_DEFAULT_TIMEZONE } from "@/lib/matchcenter/month-range";
import { getTenantMatchOperationalPolicyCached } from "@/lib/server/request-cache";

function parseSkip(value: string | null): number {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  const access = await requireApiAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const skip = parseSkip(searchParams.get("skip"));
  const scopeFrom = searchParams.get("scopeFrom");
  const scopeTo = searchParams.get("scopeTo");

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });

  const season: MatchcenterSeasonScope | null = activeSeason
    ? {
        id: activeSeason.id,
        name: activeSeason.name,
        startDate: activeSeason.startDate,
        endDate: activeSeason.endDate,
      }
    : null;

  const scheduleScope = resolveMatchcenterSpielplanScheduleScope({
    timeZone: MATCHCENTER_DEFAULT_TIMEZONE,
    season,
    scopeFromParam: scopeFrom,
    scopeToParam: scopeTo,
  });

  const query = resolveMatchcenterSpielplanungQueryWindow({
    scope: scheduleScope,
    skip,
  });

  const database = prisma as unknown as MatchcenterQueryDatabase;
  const matchOperationalPolicy = await getTenantMatchOperationalPolicyCached(tenantId);

  const page = await listMatchcenterMatchesPage(database, {
    tenantId,
    from: query.from,
    to: query.to,
    limit: query.limit,
    skip: query.skip,
    enforceMaxWindow: query.enforceMaxWindow,
    matchOperationalPolicy,
  });

  return NextResponse.json({
    items: page.items.map((match) => ({
      ...match,
      startAt: match.startAt.toISOString(),
      endAt: match.endAt?.toISOString() ?? null,
    })),
    meta: {
      total: page.total,
      hasMore: page.hasMore,
      skip: page.skip,
      limit: page.limit,
      scope: {
        from: scheduleScope.from.toISOString(),
        to: scheduleScope.to.toISOString(),
        source: scheduleScope.source,
        label: scheduleScope.label,
      },
    },
  });
}
