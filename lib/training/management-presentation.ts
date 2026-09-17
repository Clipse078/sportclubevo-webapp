/**
 * TRAININGS-UX-01J — shared Trainings management list presentation helpers.
 */

import type { TrainingSeriesManagementSort } from "@/lib/training/management-series-view";
import type { TrainingSeriesStatus } from "@/lib/training/types";

const TEAM_IDENTITY_ACCENTS = [
  "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/25",
  "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/25",
  "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/25",
  "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/25",
  "bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-500/25",
] as const;

export function resolveTeamIdentityAccentClass(teamSeasonId: string): string {
  let hash = 0;
  for (let index = 0; index < teamSeasonId.length; index += 1) {
    hash = (hash + teamSeasonId.charCodeAt(index)) % TEAM_IDENTITY_ACCENTS.length;
  }
  return TEAM_IDENTITY_ACCENTS[hash] ?? TEAM_IDENTITY_ACCENTS[0];
}

export type TrainingManagementStatusPresentation = {
  label: string;
  dotClassName: string;
};

export function trainingManagementStatusPresentation(
  status: TrainingSeriesStatus,
): TrainingManagementStatusPresentation {
  switch (status) {
    case "ACTIVE":
      return { label: "Aktiv", dotClassName: "bg-emerald-400" };
    case "INACTIVE":
      return { label: "Inaktiv", dotClassName: "bg-slate-500" };
    case "ARCHIVED":
      return { label: "Archiviert", dotClassName: "bg-slate-600" };
    default:
      return { label: status, dotClassName: "bg-slate-500" };
  }
}

export const TRAINING_MANAGEMENT_SORT_LABELS: Record<TrainingSeriesManagementSort, string> = {
  UPDATED_DESC: "Zuletzt verändert",
  TITLE_ASC: "Trainingsname A–Z",
  TEAM_ASC: "Team A–Z",
  WEEKDAY: "Wochentag",
  START_TIME: "Startzeit",
};
