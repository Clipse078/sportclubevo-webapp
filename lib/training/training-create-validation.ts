import type { TrainingComposerDraftPayload } from "@/lib/training/composer/training-composer-draft-types";
import type { TrainingCreateTabId } from "@/lib/training/training-create-workflow-config";

function timesValid(startsAt: string, endsAt: string): boolean {
  return !!startsAt && !!endsAt && startsAt < endsAt;
}

export function computeTrainingCreateTabErrors(
  payload: Pick<
    TrainingComposerDraftPayload,
    "teamSeasonId" | "title" | "validFrom" | "validUntil" | "recurrenceEnabled" | "weekdaySchedules"
  >,
): Partial<Record<TrainingCreateTabId, boolean>> {
  const errors: Partial<Record<TrainingCreateTabId, boolean>> = {};

  if (!payload.title.trim()) {
    errors.uebersicht = true;
  }

  if (!payload.teamSeasonId) {
    errors.team = true;
  }

  const primary = payload.weekdaySchedules[0];
  if (!payload.validFrom || !primary || !timesValid(primary.startsAt, primary.endsAt)) {
    errors.termin = true;
  }

  if (payload.recurrenceEnabled) {
    if (!payload.validUntil || payload.validUntil <= payload.validFrom) {
      errors.wiederholung = true;
    }
    if (payload.weekdaySchedules.length === 0) {
      errors.wiederholung = true;
    }
  }

  return errors;
}

export function firstInvalidTrainingCreateTab(
  tabErrors: Partial<Record<TrainingCreateTabId, boolean>>,
): TrainingCreateTabId | null {
  const order: TrainingCreateTabId[] = [
    "uebersicht",
    "team",
    "termin",
    "wiederholung",
    "ressourcen",
    "publikation",
  ];
  return order.find((tab) => tabErrors[tab]) ?? null;
}
