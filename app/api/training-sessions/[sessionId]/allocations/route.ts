/**
 * GET  /api/training-sessions/[sessionId]/allocations
 * POST /api/training-sessions/[sessionId]/allocations
 *
 * TRAININGCENTER-02 — occurrence-level resource allocation overrides
 * (TrainingSessionAllocation). Mirrors
 * app/api/training-series/[seriesId]/allocations/route.ts exactly, scoped
 * to a single canonical TrainingSession occurrence instead of the
 * recurring TrainingSeries.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import {
  PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS,
  PLANNING_ALLOCATIONS_VIEW_PERMISSIONS,
} from "@/lib/permissions/planning-allocation-permissions";
import { revalidatePlannerWeekPaths } from "@/lib/planning-hub/planner-week-revalidation";
import {
  createTrainingSessionAllocation,
  listAllocationsByTrainingSession,
} from "@/lib/training/session-allocation-service";
import {
  TrainingSessionNotFoundError,
  TrainingSessionAllocationResourceNotFoundError,
  TrainingSessionAllocationArchivedResourceError,
  TrainingSessionAllocationArchivedFacilityError,
  TrainingSessionAllocationDuplicateError,
} from "@/lib/training/errors";
import { loadTrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { buildCollaborationMutationResponse } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import { parseCollaborationCycleBaselineFromBody } from "@/lib/collaboration/activity-change/cycle-baseline";
import { buildTrainingMutationCollaborationImpact } from "@/lib/collaboration/training/training-mutation-collaboration";
import { resolveTenantKeyForCollaboration } from "@/lib/collaboration/resolve-tenant-key";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([...PLANNING_ALLOCATIONS_VIEW_PERMISSIONS]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const { sessionId } = await params;

  try {
    const allocations = await listAllocationsByTrainingSession(tenantId, sessionId);
    return NextResponse.json({ allocations });
  } catch (err) {
    if (err instanceof TrainingSessionNotFoundError) {
      return NextResponse.json({ error: "Training session not found" }, { status: 404 });
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([...PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const { sessionId } = await params;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Request body required" }, { status: 400 });

  const cycleBaseline = parseCollaborationCycleBaselineFromBody(body, "TRAINING", sessionId);

  if (typeof body.facilityResourceId !== "string" || !body.facilityResourceId.trim()) {
    return NextResponse.json({ error: "facilityResourceId is required" }, { status: 400 });
  }

  try {
    const beforeSnapshot = await loadTrainingActivitySnapshot({ tenantId, sessionId });
    const allocation = await createTrainingSessionAllocation(tenantId, {
      trainingSessionId: sessionId,
      facilityResourceId: body.facilityResourceId.trim(),
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : undefined,
    });
    revalidatePlannerWeekPaths();
    const userId = auth.session.user.effectiveUserId ?? auth.session.user.id;
    const tenantKey = await resolveTenantKeyForCollaboration(tenantId);
    const collaborationResult = await buildTrainingMutationCollaborationImpact({
      tenantId,
      tenantKey,
      userId,
      sessionId,
      beforeSnapshot,
      cycleBaseline,
    });
    return NextResponse.json(
      { allocation, ...buildCollaborationMutationResponse(collaborationResult) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof TrainingSessionNotFoundError) {
      return NextResponse.json({ error: "Training session not found" }, { status: 404 });
    }
    if (err instanceof TrainingSessionAllocationResourceNotFoundError) {
      return NextResponse.json({ error: "Facility resource not found" }, { status: 404 });
    }
    if (err instanceof TrainingSessionAllocationArchivedResourceError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof TrainingSessionAllocationArchivedFacilityError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof TrainingSessionAllocationDuplicateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
