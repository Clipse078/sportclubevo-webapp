/**
 * SCE-TRAININGS-UX-01 — bounded individual TrainingSession management list.
 */

import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import { toDateOnlyUtc, dateKeyFromDate } from "@/lib/training/recurrence";
import type { TrainingAllocationSummary } from "@/lib/training/operational-state";
import type { TrainingSessionAllocationDto, TrainingSessionDto, TrainingSessionStatus } from "@/lib/training/types";

export const TRAINING_MANAGEMENT_SESSION_WINDOW_DAYS = 56;
export const TRAINING_MANAGEMENT_SESSION_PAGE_SIZE = 40;

export type TrainingSessionManagementStatusFilter = "ALL" | "GEPLANT" | "AUSNAHME" | "ABGESAGT";

export type TrainingSessionManagementFilters = {
  search?: string;
  teamSeasonId?: string | null;
  status?: TrainingSessionManagementStatusFilter;
};

export type TrainingSessionManagementRow = {
  sessionId: string;
  trainingSeriesId: string;
  teamSeasonId: string;
  date: string;
  teamName: string;
  seriesTitle: string;
  startAt: string;
  endAt: string;
  timezone: string;
  facilityLabel: string | null;
  status: TrainingSessionStatus;
  displayStatus: "GEPLANT" | "AUSNAHME" | "ABGESAGT";
  exceptionReasons: string[];
  contextLabel: string;
  isRescheduled: boolean;
};

export function resolveManagementSessionDateWindow(input: {
  now?: Date;
  horizonDays?: number;
}): { dateFrom: Date; dateTo: Date; dateFromKey: string; dateToKey: string } {
  const now = input.now ?? new Date();
  const horizonDays = input.horizonDays ?? TRAINING_MANAGEMENT_SESSION_WINDOW_DAYS;
  const todayKey = dateKeyFromDate(toDateOnlyUtc(now));
  const end = new Date(`${todayKey}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + horizonDays);
  const dateToKey = dateKeyFromDate(end);

  return {
    dateFrom: new Date(`${todayKey}T00:00:00.000Z`),
    dateTo: end,
    dateFromKey: todayKey,
    dateToKey,
  };
}

function resolvePitchName(
  sessionOverrides: readonly TrainingSessionAllocationDto[] | undefined,
  seriesPitchName: string | null | undefined,
): string | null {
  const overridePitch = sessionOverrides?.find(
    (row) => classifyFacilityResourceType(row.facilityResourceType) === "PITCH_HALL",
  );
  if (overridePitch) return overridePitch.facilityResourceName;
  return seriesPitchName ?? null;
}

function deriveExceptionReasons(input: {
  session: TrainingSessionDto;
  sessionOverrides: readonly TrainingSessionAllocationDto[] | undefined;
  seriesSummary: TrainingAllocationSummary | undefined;
  sessionOverrideSummary: TrainingAllocationSummary | undefined;
}): string[] {
  const reasons: string[] = [];
  const { session } = input;

  if (session.status === "CANCELLED") {
    reasons.push("Abgesagt");
    return reasons;
  }

  if (session.isRescheduled) {
    const timeChanged =
      session.startAt !== session.originalStartAt || session.endAt !== session.originalEndAt;
    const dateChanged = session.date !== session.originalDate;
    if (dateChanged || timeChanged) {
      reasons.push("Zeit geändert");
    }
  }

  const hasPitchOverride = Boolean(
    input.sessionOverrides?.some(
      (row) => classifyFacilityResourceType(row.facilityResourceType) === "PITCH_HALL",
    ),
  );
  const hasDressingOverride = Boolean(
    input.sessionOverrides?.some(
      (row) => classifyFacilityResourceType(row.facilityResourceType) === "DRESSING_ROOM",
    ),
  );

  if (hasPitchOverride) reasons.push("Anlage geändert");
  if (hasDressingOverride) reasons.push("Garderobe geändert");

  if (
    session.dressingRoomOccupancyMode === "CUSTOM" &&
    !reasons.includes("Garderobe geändert")
  ) {
    reasons.push("Garderobe geändert");
  }

  return reasons;
}

function deriveDisplayStatus(
  session: TrainingSessionDto,
  exceptionReasons: string[],
): TrainingSessionManagementRow["displayStatus"] {
  if (session.status !== "SCHEDULED") return "ABGESAGT";
  if (exceptionReasons.length > 0) return "AUSNAHME";
  return "GEPLANT";
}

export function buildTrainingSessionManagementRows(input: {
  sessions: readonly TrainingSessionDto[];
  seriesAllocationSummaries: ReadonlyMap<string, TrainingAllocationSummary>;
  sessionAllocationSummaries: ReadonlyMap<string, TrainingAllocationSummary>;
  sessionAllocationsBySessionId: ReadonlyMap<string, readonly TrainingSessionAllocationDto[]>;
  pitchNameBySeriesId: ReadonlyMap<string, string | null>;
}): TrainingSessionManagementRow[] {
  return input.sessions
    .map((session) => {
      const sessionOverrides = input.sessionAllocationsBySessionId.get(session.id);
      const seriesSummary = input.seriesAllocationSummaries.get(session.trainingSeriesId);
      const sessionOverrideSummary = input.sessionAllocationSummaries.get(session.id);

      const exceptionReasons = deriveExceptionReasons({
        session,
        sessionOverrides,
        seriesSummary,
        sessionOverrideSummary,
      });

      const displayStatus = deriveDisplayStatus(session, exceptionReasons);

      const facilityLabel = resolvePitchName(
        sessionOverrides,
        input.pitchNameBySeriesId.get(session.trainingSeriesId),
      );

      const contextLabel =
        displayStatus === "AUSNAHME"
          ? `Aus Serie · ${session.trainingSeriesTitle}`
          : `Aus Serie · ${session.trainingSeriesTitle}`;

      return {
        sessionId: session.id,
        trainingSeriesId: session.trainingSeriesId,
        teamSeasonId: session.teamSeasonId,
        date: session.date,
        teamName: session.teamName,
        seriesTitle: session.trainingSeriesTitle,
        startAt: session.startAt,
        endAt: session.endAt,
        timezone: session.timezone,
        facilityLabel,
        status: session.status,
        displayStatus,
        exceptionReasons,
        contextLabel,
        isRescheduled: session.isRescheduled,
      };
    })
    .sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.startAt.localeCompare(b.startAt);
    });
}

export function filterTrainingSessionManagementRows(
  rows: readonly TrainingSessionManagementRow[],
  filters: TrainingSessionManagementFilters,
): TrainingSessionManagementRow[] {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const teamSeasonId = filters.teamSeasonId?.trim() || null;
  const status = filters.status ?? "ALL";

  return rows.filter((row) => {
    if (teamSeasonId && row.teamSeasonId !== teamSeasonId) return false;
    if (status !== "ALL" && row.displayStatus !== status) return false;
    if (!search) return true;
    const haystack = `${row.teamName} ${row.seriesTitle} ${row.date} ${row.facilityLabel ?? ""}`.toLowerCase();
    return haystack.includes(search);
  });
}

export function paginateTrainingSessionManagementRows(
  rows: readonly TrainingSessionManagementRow[],
  page: number,
  pageSize: number = TRAINING_MANAGEMENT_SESSION_PAGE_SIZE,
): { rows: TrainingSessionManagementRow[]; hasMore: boolean; nextPage: number | null } {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const end = safePage * pageSize;
  const slice = rows.slice(0, end);
  const hasMore = rows.length > end;
  return {
    rows: slice,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
  };
}
