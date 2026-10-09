/**
 * GET/POST /api/tournaments/[tournamentId]/resource-allocations
 *
 * TOURNAMENTCENTER-01B — list/add tournament-level Spielfeld/Halle (or
 * other) FacilityResource allocations. A home tournament may hold more
 * than one allocation (e.g. KR2 + KR3 A + KR3 B).
 *
 * POST body: { facilityResourceId: string, notes?: string, displayOrder?: number }
 *
 * Permission: EVENTS_VIEW (read) / EVENTS_MANAGE (write)
 * Tenant isolation: tenantId resolved from session, never from request body.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS,
  PLANNING_ALLOCATIONS_VIEW_PERMISSIONS,
} from "@/lib/permissions/planning-allocation-permissions";
import {
  listTournamentResourceAllocations,
  addTournamentResourceAllocation,
} from "@/lib/tournaments/resource-allocation-service";
import {
  TournamentNotFoundError,
  TournamentResourceAllocationResourceNotFoundError,
  TournamentResourceAllocationArchivedResourceError,
  TournamentResourceAllocationArchivedFacilityError,
  TournamentResourceAllocationDuplicateError,
} from "@/lib/tournaments/errors";
import { loadTournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { buildTournamentMutationCollaborationImpact } from "@/lib/collaboration/tournament/tournament-mutation-collaboration";
import { resolveTenantKeyForCollaboration } from "@/lib/collaboration/resolve-tenant-key";

type RouteContext = { params: Promise<{ tournamentId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([...PLANNING_ALLOCATIONS_VIEW_PERMISSIONS]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId } = await params;

  try {
    const allocations = await listTournamentResourceAllocations(tenantId, tournamentId);
    return NextResponse.json({ allocations });
  } catch (err) {
    if (err instanceof TournamentNotFoundError) {
      return NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 });
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([...PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.facilityResourceId !== "string" || !body.facilityResourceId.trim()) {
    return NextResponse.json({ error: "facilityResourceId is required." }, { status: 400 });
  }

  try {
    const beforeSnapshot = await loadTournamentActivitySnapshot({ tenantId, tournamentId });
    const allocation = await addTournamentResourceAllocation(tenantId, tournamentId, {
      facilityResourceId: body.facilityResourceId.trim(),
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : undefined,
    });

    revalidatePath(`/dashboard/tournamentcenter/${tournamentId}/edit`);

    const userId = access.session.user.effectiveUserId ?? access.session.user.id;
    const tenantKey = await resolveTenantKeyForCollaboration(tenantId);
    const collaboration = await buildTournamentMutationCollaborationImpact({
      tenantId,
      tenantKey,
      userId,
      tournamentId,
      beforeSnapshot,
    });

    return NextResponse.json({ allocation, collaboration }, { status: 201 });
  } catch (err) {
    if (err instanceof TournamentNotFoundError) {
      return NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 });
    }
    if (err instanceof TournamentResourceAllocationResourceNotFoundError) {
      return NextResponse.json({ error: "Ressource nicht gefunden." }, { status: 404 });
    }
    if (
      err instanceof TournamentResourceAllocationArchivedResourceError ||
      err instanceof TournamentResourceAllocationArchivedFacilityError
    ) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof TournamentResourceAllocationDuplicateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
