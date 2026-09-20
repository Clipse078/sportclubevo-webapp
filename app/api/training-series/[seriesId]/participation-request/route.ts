import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import {
  ParticipationEventNotFoundError,
  ParticipationValidationError,
} from "@/lib/participation/errors";
import { parseParticipationReminderPresetFromForm } from "@/lib/participation/participation-response-deadline-schedule";
import { updateTrainingSeriesParticipationRequestPolicy } from "@/lib/participation/participation-request-config-service";

type Params = { params: Promise<{ seriesId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.activeTenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const userId = session.user.effectiveUserId ?? session.user.id;
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

  const planningPolicy = createPlanningAuthorizationPolicy(prisma);
  const canEdit = await planningPolicy.canEditPlanningRecord(
    { userId, tenantId },
    "training",
    {
      teamId: existingSeries.teamSeason?.teamId ?? null,
      planningStage: existingSeries.planningStage,
    },
  );
  if (!canEdit) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Request body required" }, { status: 400 });

  const daysBeforeRaw = body.participationResponseDueDaysBefore;
  let participationResponseDueDaysBefore: number | null | undefined = undefined;
  if (daysBeforeRaw === null || daysBeforeRaw === "") {
    participationResponseDueDaysBefore = null;
  } else if (daysBeforeRaw !== undefined) {
    const n = Number(daysBeforeRaw);
    if (!Number.isInteger(n) || n < 0) {
      return NextResponse.json({ error: "Ungültiger Tages-Offset." }, { status: 400 });
    }
    participationResponseDueDaysBefore = n;
  }

  const localTimeRaw = body.participationResponseDueLocalTime;
  const participationResponseDueLocalTime =
    localTimeRaw === null || localTimeRaw === ""
      ? null
      : typeof localTimeRaw === "string"
        ? localTimeRaw.trim()
        : undefined;

  const r1 = parseParticipationReminderPresetFromForm(
    body.participationReminder1Preset ?? body.reminder1Preset,
  );
  const r2 = parseParticipationReminderPresetFromForm(
    body.participationReminder2Preset ?? body.reminder2Preset,
  );
  if (r1 === "invalid" || r2 === "invalid") {
    return NextResponse.json({ error: "Ungültige Erinnerungs-Voreinstellung." }, { status: 400 });
  }

  try {
    await updateTrainingSeriesParticipationRequestPolicy(
      tenantId,
      seriesId,
      {
        participationResponseDueDaysBefore,
        participationResponseDueLocalTime,
        participationReminder1PresetKey: r1,
        participationReminder2PresetKey: r2,
      },
      userId,
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
