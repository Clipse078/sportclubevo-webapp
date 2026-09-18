/**
 * TURNIERE-UX-01 — presentation + filter-option derivation for the management workspace.
 */

import { buildPlanningHubHref, type PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { resolveTrainingWeekWindow, TRAINING_DEFAULT_TIMEZONE } from "@/lib/training/date-range";
const TOURNAMENT_CATEGORY_LABELS: Record<string, string> = {
  KINDERFUSSBALL: "Kinderfussball",
  JUNIOREN: "Junioren",
  JUNIOR: "Junioren",
  AKTIVE: "Aktive",
  FRAUEN: "Frauen",
  SENIOREN: "Senioren",
  TRAININGSGRUPPE: "Trainingsgruppe",
};
import type { TournamentDto } from "./types";
import type { TournamentOperationalAssessment } from "./operational-state";
import { getTournamentParticipatingTeams } from "./team-participation";
import { TOURNAMENT_STATUS_LABELS } from "./presentation";
import {
  buildTournamentWorkspaceViewModel,
  toCalendarDateKey,
  type TournamentWorkspaceQuery,
  type TournamentWorkspaceViewModel,
} from "./workspace-view-model";

export type TurniereFilterOption = {
  value: string;
  label: string;
};

export type TurniereManagementKpis = {
  upcoming: number;
  past: number;
  total: number;
  uniqueVenues: number;
  upcomingWithin3Months: number;
};

export type TurniereStatusPresentation = {
  label: string;
  tone: "planned" | "preparation" | "live" | "neutral" | "danger" | "warning";
};

export type TurnierePublicationPresentation = {
  label: string;
  isPublic: boolean;
};

export function buildTurniereManagementWochenplanerHref(input?: {
  timezone?: string;
  now?: Date;
}): string {
  const timezone = input?.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: null,
    now: input?.now,
    timeZone: timezone,
  });

  const state: PlanningHubUrlState = {
    week: weekWindow.param,
    perspective: "kalender",
    activity: "turniere",
    team: null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
  };

  return buildPlanningHubHref(state);
}

export function buildTournamentWochenplanerHref(input: {
  startAt: string;
  teamId?: string | null;
  timezone?: string;
}): string {
  const timezone = input.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const day = toCalendarDateKey(input.startAt, timezone);
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: day,
    timeZone: timezone,
  });

  const state: PlanningHubUrlState = {
    week: weekWindow.param,
    perspective: "kalender",
    activity: "turniere",
    team: input.teamId?.trim() || null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
    day,
  };

  return buildPlanningHubHref(state);
}

export function deriveTurniereFilterOptions(tournaments: readonly TournamentDto[]): {
  categories: TurniereFilterOption[];
  ageClasses: TurniereFilterOption[];
  locations: TurniereFilterOption[];
} {
  const categories = new Map<string, string>();
  const ages = new Map<string, string>();
  const locations = new Map<string, string>();

  for (const tournament of tournaments) {
    const location = tournament.location?.trim();
    if (location) {
      locations.set(location, location);
    }

    for (const team of getTournamentParticipatingTeams(tournament)) {
      const categoryKey = team.category.trim().toUpperCase();
      if (categoryKey) {
        categories.set(
          categoryKey,
          TOURNAMENT_CATEGORY_LABELS[categoryKey] ?? team.category,
        );
      }
      const age = team.ageGroup?.trim();
      if (age) {
        ages.set(age.toUpperCase(), age.toUpperCase());
      }
    }
  }

  const sortOptions = (entries: Map<string, string>) =>
    [...entries.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "de"))
      .map(([value, label]) => ({ value, label }));

  return {
    categories: sortOptions(categories),
    ageClasses: sortOptions(ages),
    locations: sortOptions(locations),
  };
}

export function deriveTurniereManagementKpis(
  summary: TournamentWorkspaceViewModel["summary"],
): TurniereManagementKpis {
  return {
    upcoming: summary.upcoming,
    past: summary.past,
    total: summary.total,
    uniqueVenues: summary.uniqueVenues,
    upcomingWithin3Months: summary.upcomingWithin3Months,
  };
}

export function deriveTournamentCalendarDayKeys(
  tournaments: readonly TournamentDto[],
  timeZone: string,
): string[] {
  const keys = new Set<string>();
  for (const tournament of tournaments) {
    keys.add(toCalendarDateKey(tournament.startAt, timeZone));
  }
  return [...keys].sort();
}

export function isTenantHostedTournament(tournament: Pick<TournamentDto, "homeAway">): boolean {
  return tournament.homeAway === "HOME";
}

export function resolveTournamentRowCrest(
  tournament: TournamentDto,
  tenantLogoUrl: string | null | undefined,
): { logoUrl: string | null; altName: string } {
  const organizerName = tournament.organizerName?.trim() || tournament.title;
  if (tournament.organizerLogoUrl) {
    return { logoUrl: tournament.organizerLogoUrl, altName: organizerName };
  }
  if (tournament.homeAway === "HOME" && tenantLogoUrl?.trim()) {
    return { logoUrl: tenantLogoUrl.trim(), altName: organizerName };
  }
  return { logoUrl: null, altName: organizerName };
}

export function resolveTournamentCategoryAgeLine(
  tournament: Pick<TournamentDto, "participants" | "team">,
): string | null {
  const teams = getTournamentParticipatingTeams(tournament);
  const primary = teams[0];
  if (!primary) return null;

  const categoryLabel =
    TOURNAMENT_CATEGORY_LABELS[primary.category.trim().toUpperCase()] ?? null;
  const age = primary.ageGroup?.trim().toUpperCase();

  if (categoryLabel && age) {
    return `${categoryLabel} ${age}`;
  }
  if (primary.name.trim()) {
    return primary.name.trim();
  }
  return categoryLabel;
}

export function resolveTournamentOperationalLine(
  tournament: TournamentDto,
  timeZone = "Europe/Zurich",
  locale = "de-CH",
): string[] {
  const segments: string[] = [];
  const participantCount = tournament.participants.length;
  if (participantCount > 0) {
    segments.push(
      `${participantCount} ${participantCount === 1 ? "Team" : "Teams"}`,
    );
  }

  const formatLabel = tournament.competitionLabel?.trim();
  if (formatLabel) {
    segments.push(formatLabel);
  }

  const start = new Date(tournament.startAt);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(start);
  segments.push(`Start ${timeLabel}`);

  return segments;
}

export function resolveTournamentStatusPresentation(
  tournament: Pick<TournamentDto, "status">,
  assessment: TournamentOperationalAssessment,
): TurniereStatusPresentation {
  if (tournament.status === "LIVE") {
    return { label: "Live", tone: "live" };
  }
  if (tournament.status === "CANCELLED") {
    return { label: TOURNAMENT_STATUS_LABELS.CANCELLED ?? "Storniert", tone: "danger" };
  }
  if (tournament.status === "DRAFT") {
    return { label: TOURNAMENT_STATUS_LABELS.DRAFT ?? "Entwurf", tone: "neutral" };
  }
  if (assessment.status === "OPEN") {
    return { label: "In Vorbereitung", tone: "preparation" };
  }
  if (tournament.status === "SCHEDULED") {
    return { label: "Geplant", tone: "planned" };
  }

  const label = TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status;
  return { label, tone: "neutral" };
}

export function resolveTournamentPublicationPresentation(
  tournament: Pick<TournamentDto, "visibility">,
): TurnierePublicationPresentation {
  if (tournament.visibility.websiteVisible) {
    return { label: "Öffentlich", isPublic: true };
  }
  const anyChannel =
    tournament.visibility.infoboardVisible ||
    tournament.visibility.homepageVisible ||
    tournament.visibility.wochenplanVisible ||
    tournament.visibility.teamPageVisible;
  if (anyChannel) {
    return { label: "Intern", isPublic: false };
  }
  return { label: "Nicht veröffentlicht", isPublic: false };
}

export function deriveTurniereManagementPresentation(
  tournaments: readonly TournamentDto[],
  query: TournamentWorkspaceQuery,
  options: { now?: Date; timeZone?: string; locale?: string } = {},
): {
  viewModel: TournamentWorkspaceViewModel;
  kpis: TurniereManagementKpis;
  filterOptions: ReturnType<typeof deriveTurniereFilterOptions>;
  calendarDayKeys: string[];
} {
  const timeZone = options.timeZone ?? "Europe/Zurich";
  const viewModel = buildTournamentWorkspaceViewModel(tournaments, query, options);

  return {
    viewModel,
    kpis: deriveTurniereManagementKpis(viewModel.summary),
    filterOptions: deriveTurniereFilterOptions(tournaments),
    calendarDayKeys: deriveTournamentCalendarDayKeys(tournaments, timeZone),
  };
}

export { matchDayKeyInTimezone };
