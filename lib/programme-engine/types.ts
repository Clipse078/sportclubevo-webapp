import type { SceActivityPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";
import type { PersonalProgrammePresentationStatus } from "@/lib/personal-agenda/personal-programme-types";

/** TEAM → CLUB → PERSON — one engine, scope-aware relevance. */
export type ProgrammeScope =
  | {
      kind: "TEAM";
      teamId: string;
      teamSeasonId: string;
      /** Team's assigned org unit (exact-unit Club Event relevance). */
      orgUnitId: string | null;
    }
  | {
      kind: "CLUB";
    }
  | {
      kind: "PERSON";
      personId: string | null;
      /** Active sporting team relationships (trainer/player/assignment). */
      relevantTeamIds: readonly string[];
      relevantTeamSeasonIds: readonly string[];
      /** Person org-unit memberships for exact-unit Club Event audience. */
      orgUnitIds: readonly string[];
    };

export type ProgrammeActivityKind = "TRAINING" | "MATCH" | "TOURNAMENT" | "CLUB_EVENT";

export const PROGRAMME_ACTIVITY_KINDS: readonly ProgrammeActivityKind[] = [
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "CLUB_EVENT",
] as const;

export type ProgrammeTemporalMode = "upcoming" | "past" | "range";

export type ProgrammeFilters = {
  teamIds?: readonly string[];
  orgUnitIds?: readonly string[];
  activityKinds?: readonly ProgrammeActivityKind[];
  /** Normalized presentation statuses where meaningful (scheduled, cancelled, …). */
  statuses?: readonly PersonalProgrammePresentationStatus[];
};

export type ProgrammeQueryInput = {
  tenantId: string;
  timeZone: string;
  now?: Date;
  scope: ProgrammeScope;
  temporal?: ProgrammeTemporalMode;
  from?: Date;
  to?: Date;
  filters?: ProgrammeFilters;
  userId: string;
  permissionKeys: readonly string[];
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
};

export type ProgrammeItem = {
  /** Stable deterministic identity for list/calendar views. */
  id: string;
  kind: ProgrammeActivityKind;
  domainId: string;
  resourceKey: string;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  presentation: SceActivityPresentationModel;
  teamId: string | null;
  teamSeasonId: string | null;
  orgUnitId: string | null;
  status?: PersonalProgrammePresentationStatus | string;
  /** Canonical consume navigation target (activity detail). */
  navigationTarget: string;
};

export type ProgrammeQueryResult = {
  items: ProgrammeItem[];
  range: { rangeStart: Date; rangeEnd: Date };
  scope: ProgrammeScope;
};
