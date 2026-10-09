/**
 * DELETE /api/tournaments/[tournamentId]/resource-allocations/[allocationId]
 *
 * TOURNAMENTCENTER-01B — removes a tournament-level Spielfeld/Halle
 * allocation.
 *
 * Permission: EVENTS_MANAGE
 * Tenant isolation: tenantId resolved from session, never from request body.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { removeTournamentResourceAllocation } from "@/lib/tournaments/resource-allocation-service";
import { TournamentResourceAllocationNotFoundError } from "@/lib/tournaments/errors";
import { prisma } from "@/lib/db/prisma";
import { loadTournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { buildCollaborationMutationResponse } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import { parseCollaborationCycleBaselineFromBody } from "@/lib/collaboration/activity-change/cycle-baseline";
import { buildTournamentMutationCollaborationImpact } from "@/lib/collaboration/tournament/tournament-mutation-collaboration";
import { resolveTenantKeyForCollaboration } from "@/lib/collaboration/resolve-tenant-key";

type RouteContext = { params: Promise<{ tournamentId: string; allocationId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, allocationId } = await params;

  let cycleBaseline = null;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    cycleBaseline = parseCollaborationCycleBaselineFromBody(body, "TOURNAMENT", tournamentId);
  } catch {
    cycleBaseline = null;
  }

  try {
    // Enforce URL ownership before mutation.
    const existing = await prisma.tournamentResourceAllocation.findFirst({
      where: { id: allocationId, tenantId },
      select: { eventId: true },
    });
    if (!existing || existing.eventId !== tournamentId) {
      return NextResponse.json({ error: "Zuweisung nicht gefunden." }, { status: 404 });
    }

    const beforeSnapshot = await loadTournamentActivitySnapshot({ tenantId, tournamentId });
    await removeTournamentResourceAllocation(tenantId, allocationId);

    revalidatePath(`/dashboard/tournamentcenter/${tournamentId}/edit`);

    const userId = access.session.user.effectiveUserId ?? access.session.user.id;
    const tenantKey = await resolveTenantKeyForCollaboration(tenantId);
    const collaborationResult = await buildTournamentMutationCollaborationImpact({
      tenantId,
      tenantKey,
      userId,
      tournamentId,
      beforeSnapshot,
      cycleBaseline,
    });

    return NextResponse.json({
      ok: true,
      ...buildCollaborationMutationResponse(collaborationResult),
    });
  } catch (err) {
    if (err instanceof TournamentResourceAllocationNotFoundError) {
      return NextResponse.json({ error: "Zuweisung nicht gefunden." }, { status: 404 });
    }
    throw err;
  }
}
