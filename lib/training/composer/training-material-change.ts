import type { SceActivityMaterialChangeCategory } from "@/lib/sce/activity-governance/revision-model";
import type { TrainingComposerDraftPayload } from "./training-composer-draft-types";

export function classifyTrainingMaterialChanges(
  previous: TrainingComposerDraftPayload,
  next: TrainingComposerDraftPayload,
): SceActivityMaterialChangeCategory[] {
  const categories: SceActivityMaterialChangeCategory[] = [];

  if (previous.teamSeasonId !== next.teamSeasonId) {
    categories.push("ORGANISATIONAL_AUDIENCE");
  }

  if (
    previous.validFrom !== next.validFrom ||
    JSON.stringify(previous.weekdaySchedules) !== JSON.stringify(next.weekdaySchedules)
  ) {
    categories.push("SCHEDULE");
  }

  if (
    previous.recurrenceEnabled !== next.recurrenceEnabled ||
    previous.validUntil !== next.validUntil
  ) {
    categories.push("RECURRENCE");
  }

  if (JSON.stringify(previous.resources) !== JSON.stringify(next.resources)) {
    categories.push("VENUE_OR_RESOURCES");
  }

  if (previous.title.trim() !== next.title.trim()) {
    categories.push("SCHEDULE");
  }

  return categories;
}
