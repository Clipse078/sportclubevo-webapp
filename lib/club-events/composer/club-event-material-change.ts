import type { SceActivityMaterialChangeCategory } from "@/lib/sce/activity-governance/revision-model";
import type { ClubEventComposerDraftPayload } from "./club-event-composer-draft-types";

export function classifyClubEventMaterialChanges(
  previous: ClubEventComposerDraftPayload,
  next: ClubEventComposerDraftPayload,
): SceActivityMaterialChangeCategory[] {
  const categories: SceActivityMaterialChangeCategory[] = [];

  if (
    previous.schedule.startDate !== next.schedule.startDate ||
    previous.schedule.startTime !== next.schedule.startTime ||
    previous.schedule.endDate !== next.schedule.endDate ||
    previous.schedule.endTime !== next.schedule.endTime ||
    previous.schedule.allDay !== next.schedule.allDay
  ) {
    categories.push("SCHEDULE");
  }

  if (JSON.stringify(previous.recurrence) !== JSON.stringify(next.recurrence)) {
    categories.push("RECURRENCE");
  }

  if (
    previous.audience.scope !== next.audience.scope ||
    JSON.stringify(previous.audience.targets) !== JSON.stringify(next.audience.targets)
  ) {
    categories.push("ORGANISATIONAL_AUDIENCE");
  }

  if (JSON.stringify(previous.resources) !== JSON.stringify(next.resources)) {
    categories.push("VENUE_OR_RESOURCES");
  }

  if (JSON.stringify(previous.ausspielung) !== JSON.stringify(next.ausspielung)) {
    categories.push("PUBLICATION_SCOPE");
  }

  if (previous.title.trim() !== next.title.trim()) {
    categories.push("SCHEDULE");
  }

  return categories;
}
