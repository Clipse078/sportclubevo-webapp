/**
 * POST /api/training-series/[seriesId]/restore — restore an archived TrainingSeries (TRAININGS-UX-02).
 *
 * Uses the canonical restoreTrainingSeries service (status → INACTIVE, clears archivedAt).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import { restoreTrainingSeries } from "@/lib/training/training-service";
import { TrainingSeriesNotFoundError } from "@/lib/training/errors";
import type { PlanningRecord } from "@/lib/planning/planning-authorization-policy";

type Params = { params: Promise<{ seriesId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const userId = session.user.effectiveUserId ?? session.user.id;
  if (!userId) return NextResponse.json({ error: "User identity required" }, { status: 403 });

  const { seriesId } = await params;

  const existingSeries = await prisma.trainingSeries.findFirst({
    where: { id: seriesId, tenantId },
    select: {
      id: true,
      planningStage: true,
      teamSeason: { select: { teamId: true } },
    },
  });
  if (!existingSeries) {
    return NextResponse.json({ error: "Trainingsserie nicht gefunden." }, { status: 404 });
  }

  const planningRecord: PlanningRecord = {
    teamId: existingSeries.teamSeason?.teamId ?? null,
    planningStage: existingSeries.planningStage,
  };
  const planningPolicy = createPlanningAuthorizationPolicy(prisma);
  const canEdit = await planningPolicy.canEditPlanningRecord(
    { userId, tenantId },
    "training",
    planningRecord,
  );
  if (!canEdit) {
    return NextResponse.json(
      { error: "Keine Berechtigung zum Reaktivieren dieser Trainingsserie." },
      { status: 403 },
    );
  }

  try {
    const series = await restoreTrainingSeries(tenantId, seriesId);
    return NextResponse.json({ series });
  } catch (err) {
    if (err instanceof TrainingSeriesNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
