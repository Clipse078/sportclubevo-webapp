import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  ParticipationEventNotFoundError,
  ParticipationValidationError,
} from "@/lib/participation/errors";
import { parseParticipationRequestConfigBody } from "@/lib/participation/participation-request-api";
import { updateEventParticipationRequestConfig } from "@/lib/participation/participation-request-config-service";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ tournamentId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const { tournamentId } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Request body required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const timeZone = tenant?.timezone ?? "Europe/Zurich";

  try {
    const parsed = parseParticipationRequestConfigBody(body, timeZone);
    await updateEventParticipationRequestConfig(
      tenantId,
      tournamentId,
      parsed,
      access.session.user.effectiveUserId ?? access.session.user.id,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ParticipationValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ParticipationEventNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
