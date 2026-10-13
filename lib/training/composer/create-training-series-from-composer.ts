import { prisma } from "@/lib/db/prisma";
import { createTrainingSeries, getTrainingSeries } from "@/lib/training/training-service";
import { generateTrainingSessions } from "@/lib/training/session-generation-service";
import { createTrainingAllocation } from "@/lib/training/training-allocation-service";
import { deleteTrainingSeriesPermanently } from "@/lib/training/training-lifecycle-service";
import { parseWeekdaySchedules, parseRequiredDate } from "@/lib/training/series-request-helpers";
import type { TrainingComposerDraftPayload } from "./training-composer-draft-types";

export type CreateTrainingSeriesFromComposerResult = {
  seriesId: string;
  firstSessionId: string | null;
};

function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveTrainingComposerDateWindow(payload: TrainingComposerDraftPayload): {
  validFrom: Date;
  validUntil: Date;
} {
  const validFromParsed = parseRequiredDate(payload.validFrom, "validFrom");
  if (!validFromParsed.ok) {
    throw new Error(validFromParsed.error);
  }

  const validUntilKey = payload.recurrenceEnabled
    ? payload.validUntil
    : addDaysToDateKey(payload.validFrom, 1);
  const validUntilParsed = parseRequiredDate(validUntilKey, "validUntil");
  if (!validUntilParsed.ok) {
    throw new Error(validUntilParsed.error);
  }

  if (validFromParsed.value >= validUntilParsed.value) {
    throw new Error("validFrom must be before validUntil");
  }

  return { validFrom: validFromParsed.value, validUntil: validUntilParsed.value };
}

export async function createTrainingSeriesFromComposerPayload(input: {
  tenantId: string;
  actorUserId: string;
  payload: TrainingComposerDraftPayload;
  planningStage: "DRAFT" | "APPROVED";
}): Promise<CreateTrainingSeriesFromComposerResult> {
  const { validFrom, validUntil } = resolveTrainingComposerDateWindow(input.payload);

  const schedules = parseWeekdaySchedules(input.payload.weekdaySchedules);
  if (!schedules.ok) {
    throw new Error(schedules.error);
  }

  const facilityResourceIds = input.payload.resources.map((r) => r.facilityResourceId);

  const created = await createTrainingSeries(input.tenantId, {
    teamSeasonId: input.payload.teamSeasonId,
    title: input.payload.title.trim(),
    description: input.payload.description.trim() || null,
    timezone: input.payload.timezone.trim() || "Europe/Zurich",
    startsAt: schedules.value.startsAt,
    endsAt: schedules.value.endsAt,
    weekdays: schedules.value.weekdays,
    weekdayTimes: schedules.value.weekdayTimes,
    validFrom,
    validUntil,
    planningStage: input.planningStage,
    createdByUserId: input.actorUserId,
  });

  await generateTrainingSessions(input.tenantId, created.id, {
    from: validFrom,
    to: validUntil,
  });

  for (const facilityResourceId of facilityResourceIds) {
    try {
      await createTrainingAllocation(input.tenantId, {
        trainingSeriesId: created.id,
        facilityResourceId,
      });
    } catch (allocationErr) {
      await deleteTrainingSeriesPermanently(input.tenantId, created.id);
      throw allocationErr instanceof Error
        ? allocationErr
        : new Error("Ressource konnte nicht zugewiesen werden.");
    }
  }

  await getTrainingSeries(input.tenantId, created.id);

  const firstSession = await prisma.trainingSession.findFirst({
    where: {
      tenantId: input.tenantId,
      trainingSeriesId: created.id,
      status: "SCHEDULED",
    },
    orderBy: { date: "asc" },
    select: { id: true },
  });

  return { seriesId: created.id, firstSessionId: firstSession?.id ?? null };
}
