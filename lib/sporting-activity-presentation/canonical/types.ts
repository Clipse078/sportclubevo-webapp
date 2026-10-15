import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { PersonalProgrammePresentationStatus } from "@/lib/personal-agenda/personal-programme-types";
import type {
  SportingActivityLocation,
  SportingActivitySchedule,
} from "@/lib/sporting-activity-presentation/types";

/** Canonical SCE activity discriminant (01C). */
export type SceActivityKind = "MATCH" | "TRAINING" | "TOURNAMENT" | "CLUB_EVENT";

/** Canonical presentation density — identity grammar is invariant across densities. */
export type SceActivityPresentationDensity = "HERO" | "STANDARD" | "COMPACT" | "MICRO";

export type SceActivityLocation = SportingActivityLocation;

export type SceActivitySchedule = SportingActivitySchedule;

export type ScePresentationStatusSemantic =
  | "neutral"
  | "active"
  | "planned"
  | "completed"
  | "cancelled"
  | "warning";

export type SceActivityPresentationStatus = {
  /** Domain or mapped lifecycle value when available — not a substitute for semantic category. */
  domain?: PersonalProgrammePresentationStatus | string;
  semantic: ScePresentationStatusSemantic;
  label?: string;
};

export type SceActivityRoute = {
  resourceKey: string;
  consumeHref: string | null;
  manageHref: string | null;
  defaultContextTab?: string;
};

export type SceActivityPresentationBase = {
  activityId: string;
  resourceKey: string;
  typeLabel: string;
  schedule: SceActivitySchedule;
  location: SceActivityLocation;
  route: SceActivityRoute;
  status?: SceActivityPresentationStatus;
};

export type SceMatchFixtureIdentity = {
  home: ClubIdentity;
  away: ClubIdentity;
  /** Fixture-authoritative ordering — home left, away right. */
  homeLeftAwayRightInvariant: true;
};

export type SceMatchResult = {
  scoreHome: number | null;
  scoreAway: number | null;
  displayLabel: string | null;
};

/** Quiet contextual metadata (tenant side, result perspective) — not primary lifecycle. */
export type SceMatchContextBadge = {
  kind: "tenant-side" | "result-perspective";
  label: string;
};

export type SceMatchPresentationModel = SceActivityPresentationBase & {
  kind: "MATCH";
  fixture: SceMatchFixtureIdentity;
  competition?: { label: string };
  teamContext?: { name: string };
  result: SceMatchResult | null;
  matchLifecycle?: SceActivityPresentationStatus;
  contextBadges?: SceMatchContextBadge[];
};

/** Session uses `schedule` on the base model; recurring series uses `recurrence`. */
export type SceTrainingRecurrencePresentation = {
  weekdayShortLabels: string[];
  /** e.g. Mo · Mi · Fr when labels are joined for display */
  rhythmLabel?: string;
  timeLabel: string;
  timeDetailLines?: string[] | null;
};

export type SceTrainingSchedulePresentation =
  | { kind: "SESSION" }
  | { kind: "RECURRING_DEFINITION"; recurrence: SceTrainingRecurrencePresentation };

export type SceTrainingDressingRoomPresentation = {
  label: string;
};

export type SceTrainingPresentationModel = SceActivityPresentationBase & {
  kind: "TRAINING";
  trainingTitle: string;
  team?: { name: string };
  /** Tenant / owning club for MICRO crest (distinct from opponent / organiser semantics). */
  tenantClub?: ClubIdentity;
  schedulePresentation?: SceTrainingSchedulePresentation;
  dressingRoom?: SceTrainingDressingRoomPresentation;
};

export function isSceTrainingPresentationModel(
  value: SceActivityPresentationModel,
): value is SceTrainingPresentationModel {
  return value.kind === "TRAINING";
}

export function isSceTournamentPresentationModel(
  value: SceActivityPresentationModel,
): value is SceTournamentPresentationModel {
  return value.kind === "TOURNAMENT";
}

export type SceTournamentPresentationModel = SceActivityPresentationBase & {
  kind: "TOURNAMENT";
  tournamentTitle: string;
  organiser: ClubIdentity;
  hauptteam?: { name: string };
  /** Own SCE teams (0:n) — compact list-row / MICRO rendering uses {@link formatSceTournamentOwnTeamsCompactLabel}. */
  ownTeams?: readonly string[];
};

/** Event scope / «Gültig für» — separate from organiser, publication, and participation. */
export type SceClubEventAudiencePresentation = {
  scope: "CLUB_WIDE" | "SELECTED_ORG_UNITS";
  /** Primary line: «Gesamter Verein», single target name, or joined names when space allows. */
  primaryLabel: string;
  /** Optional short label for MICRO / list-row (e.g. «3 Organisationseinheiten»). */
  compactLabel?: string;
  /** Authoritative target names for tooltips / screen readers when primary is abbreviated. */
  detailLabels?: string[];
  targetCount?: number;
  teamCount?: number;
  orgUnitCount?: number;
};

export type SceClubEventPresentationModel = SceActivityPresentationBase & {
  kind: "CLUB_EVENT";
  eventTitle: string;
  organiser?: ClubIdentity;
  audience?: SceClubEventAudiencePresentation;
};

export type SceActivityPresentationModel =
  | SceMatchPresentationModel
  | SceTrainingPresentationModel
  | SceTournamentPresentationModel
  | SceClubEventPresentationModel;

export function isSceActivityPresentationModel(
  value: unknown,
): value is SceActivityPresentationModel {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === "MATCH" ||
    kind === "TRAINING" ||
    kind === "TOURNAMENT" ||
    kind === "CLUB_EVENT"
  );
}

export function isSceMatchPresentationModel(
  value: SceActivityPresentationModel,
): value is SceMatchPresentationModel {
  return value.kind === "MATCH";
}

export function isSceClubEventPresentationModel(
  value: SceActivityPresentationModel,
): value is SceClubEventPresentationModel {
  return value.kind === "CLUB_EVENT";
}
