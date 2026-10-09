/**
 * DELETE /api/training-sessions/[sessionId]/allocations/[allocationId]
 *
 * TRAININGCENTER-02 — removes one occurrence-level allocation override.
 * When this removes the last override row for an allocation group
 * (Spielfeld/Halle or Garderobe), that group reverts to the TrainingSeries
 * default for this occurrence — see session-allocation-service.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS } from "@/lib/permissions/planning-allocation-permissions";
import { revalidatePlannerWeekPaths } from "@/lib/planning-hub/planner-week-revalidation";
import {
  getTrainingSessionAllocation,
  deleteTrainingSessionAllocation,
} from "@/lib/training/session-allocation-service";
import { TrainingSessionAllocationNotFoundError } from "@/lib/training/errors";
import { loadTrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { buildCollaborationMutationResponse } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import { parseCollaborationCycleBaselineFromBody } from "@/lib/collaboration/activity-change/cycle-baseline";
import { buildTrainingMutationCollaborationImpact } from "@/lib/collaboration/training/training-mutation-collaboration";
import { resolveTenantKeyForCollaboration } from "@/lib/collaboration/resolve-tenant-key";

type Params = { params: Promise<{ sessionId: string; allocationId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([...PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const tenantId = auth.session.user?.activeTenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const { sessionId, allocationId } = await params;

  let cycleBaseline = null;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    cycleBaseline = parseCollaborationCycleBaselineFromBody(body, "TRAINING", sessionId);
  } catch {
    cycleBaseline = null;
  }

  try {
    const beforeSnapshot = await loadTrainingActivitySnapshot({ tenantId, sessionId });
    // Enforce URL ownership before mutation
    const existing = await getTrainingSessionAllocation(tenantId, allocationId);
    if (existing.trainingSessionId !== sessionId) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }
    await deleteTrainingSessionAllocation(tenantId, allocationId);
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
    return NextResponse.json({
      ok: true,
      ...buildCollaborationMutationResponse(collaborationResult),
    });
  } catch (err) {
    if (err instanceof TrainingSessionAllocationNotFoundError) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }
    throw err;
  }
}
