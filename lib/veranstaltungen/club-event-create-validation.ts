import type { ClubEventOrganisationalAudienceEditorValue } from "@/components/admin/veranstaltungen/ClubEventOrganisationalAudienceEditor";
import type { VeranstaltungScheduleFieldValues } from "@/components/admin/veranstaltungen/VeranstaltungScheduleFields";
import type { ClubEventCreateTabId } from "@/lib/veranstaltungen/club-event-create-workflow-config";

export function computeClubEventCreateTabErrors(input: {
  seasonId: string;
  title: string;
  schedule: VeranstaltungScheduleFieldValues;
  audience: ClubEventOrganisationalAudienceEditorValue;
  recurrenceEnabled: boolean;
  recurrenceEndDate: string;
  recurrenceOccurrenceCount: string;
  recurrenceEndMode: "ON_DATE" | "AFTER_COUNT";
}): Partial<Record<ClubEventCreateTabId, boolean>> {
  const errors: Partial<Record<ClubEventCreateTabId, boolean>> = {};

  if (!input.seasonId || !input.title.trim()) {
    errors.uebersicht = true;
  }

  if (
    input.audience.scope === "SELECTED_ORG_UNITS" &&
    input.audience.targets.length === 0
  ) {
    errors.gueltigkeit = true;
  }

  if (!input.schedule.startDate) {
    errors.termin = true;
  } else if (input.recurrenceEnabled) {
    if (input.recurrenceEndMode === "ON_DATE" && !input.recurrenceEndDate) {
      errors.termin = true;
    }
    if (
      input.recurrenceEndMode === "AFTER_COUNT" &&
      (!input.recurrenceOccurrenceCount || Number(input.recurrenceOccurrenceCount) < 1)
    ) {
      errors.termin = true;
    }
  }

  return errors;
}

export function firstInvalidClubEventCreateTab(
  tabErrors: Partial<Record<ClubEventCreateTabId, boolean>>,
): ClubEventCreateTabId | null {
  const order: ClubEventCreateTabId[] = [
    "uebersicht",
    "gueltigkeit",
    "termin",
    "ressourcen",
    "publikation",
  ];
  return order.find((tab) => tabErrors[tab]) ?? null;
}
