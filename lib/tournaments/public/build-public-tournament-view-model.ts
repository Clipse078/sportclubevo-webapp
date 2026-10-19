/**
 * Maps canonical Planung domain snapshot → public-safe tournament projection.
 */

import type { PlanungDomainSnapshot } from "@/lib/tournaments/planung/build-planung-view-model";
import { buildTournamentPlanungViewModel } from "@/lib/tournaments/planung/build-planung-view-model";
import type {
  TournamentPlanungBoardCell,
  TournamentPlanungBreakBlock,
  TournamentPlanungFixtureBlock,
} from "@/lib/tournaments/planung/types";
import { formatPlanungBreakScopeLabel } from "@/lib/tournaments/planung/planung-schedule-sections";
import type {
  PublicTournamentHeader,
  PublicTournamentPublicationState,
  PublicTournamentScheduleEntry,
  PublicTournamentViewModel,
} from "./types";
import { buildPublicTournamentPath } from "./build-public-tournament-url";
import { buildTournamentSpielplanFromPlanung } from "@/lib/tournaments/spielplan/build-tournament-spielplan-view-model";

function mapFixtureCell(
  cell: TournamentPlanungFixtureBlock,
  pitchLabelById: ReadonlyMap<string, string>,
  nowMs: number,
): PublicTournamentScheduleEntry {
  const pitchLabel = pitchLabelById.get(cell.pitchId) ?? "Feld";
  const endMs = Date.parse(cell.endUtc);
  const scheduleState =
    cell.result?.state === "COMPLETED" || endMs < nowMs ? "COMPLETED" : "UPCOMING";

  const result =
    cell.result?.state === "COMPLETED"
      ? {
          state: "COMPLETED" as const,
          scoreSideA: cell.result.scoreSideA,
          scoreSideB: cell.result.scoreSideB,
        }
      : cell.result
        ? { state: "UNPLAYED" as const, scoreSideA: null, scoreSideB: null }
        : null;

  const accessibleLabel = cell.accessibleLabel.replace(/, (Zeit|Feld) gesperrt[^,]*/gi, "");

  return {
    kind: "FIXTURE",
    fixtureId: cell.fixtureId,
    sideA: {
      label: cell.sideA.label,
      crestUrl: cell.sideA.crestUrl,
      isPlaceholder: cell.sideA.isPlaceholder,
      participantId: cell.sideA.participantId,
      qualificationProvenanceLabel: cell.sideA.qualificationProvenanceLabel,
    },
    sideB: {
      label: cell.sideB.label,
      crestUrl: cell.sideB.crestUrl,
      isPlaceholder: cell.sideB.isPlaceholder,
      participantId: cell.sideB.participantId,
      qualificationProvenanceLabel: cell.sideB.qualificationProvenanceLabel,
    },
    startUtc: cell.startUtc,
    endUtc: cell.endUtc,
    pitchLabel,
    phaseLabel: cell.phaseLabel,
    groupLabel: cell.groupLabel,
    phaseType: cell.phaseType,
    result,
    accessibleLabel,
    scheduleState,
  };
}

function mapBreakCell(
  cell: TournamentPlanungBreakBlock,
  pitchLabelById: ReadonlyMap<string, string>,
): PublicTournamentScheduleEntry {
  const pitchLabels = cell.pitchIds.map((id) => pitchLabelById.get(id) ?? "Feld");
  return {
    kind: "BREAK",
    breakId: cell.breakId,
    label: cell.label,
    startUtc: cell.startUtc,
    endUtc: cell.endUtc,
    scopeLabel: formatPlanungBreakScopeLabel(cell.scope, pitchLabels),
    accessibleLabel: cell.accessibleLabel,
  };
}

function mapTimelineCell(
  cell: TournamentPlanungBoardCell,
  pitchLabelById: ReadonlyMap<string, string>,
  nowMs: number,
): PublicTournamentScheduleEntry {
  if (cell.kind === "BREAK") return mapBreakCell(cell, pitchLabelById);
  return mapFixtureCell(cell, pitchLabelById, nowMs);
}

export function buildPublicTournamentViewModel(input: {
  tenantKey: string;
  header: PublicTournamentHeader;
  publication: PublicTournamentPublicationState;
  snapshot: PlanungDomainSnapshot;
  now?: Date;
}): PublicTournamentViewModel {
  const planung = buildTournamentPlanungViewModel({
    ...input.snapshot,
    feasibility: null,
    smartTiming: null,
    optimisation: null,
    regenerationMetrics: undefined,
  });

  const pitchLabelById = new Map(planung.pitches.map((p) => [p.pitchId, p.label]));
  const nowMs = (input.now ?? new Date()).getTime();

  const scheduleSections = planung.scheduleSections.map((section) => ({
    sectionId: section.sectionId,
    title: section.title,
    entries: section.entries.map((entry) => mapTimelineCell(entry, pitchLabelById, nowMs)),
  }));

  const mobileTimeline = planung.mobileTimeline.map((entry) =>
    mapTimelineCell(entry, pitchLabelById, nowMs),
  );

  const groupStandings = planung.groupStandings.map((section) => ({
    groupId: section.groupId,
    groupLabel: section.groupLabel,
    rows: section.rows.map((row) => ({
      position: row.position,
      participantId: row.participantId,
      displayName: row.displayName,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      points: row.points,
      tiedAtPosition: row.tiedAtPosition,
    })),
  }));

  const participants = input.snapshot.participants.map((p) => ({
    id: p.participantId,
    displayName: p.displayName,
    crestUrl: p.crestUrl,
  }));

  const spielplan = buildTournamentSpielplanFromPlanung({
    tournamentId: input.header.id,
    title: input.header.title,
    startAtIso: input.header.startAt,
    location: input.header.location,
    organizerName: input.header.organizerName,
    tenantName: null,
    tenantLogoUrl: null,
    timezone: input.snapshot.timezone,
    pitches: planung.pitches.map((p) => ({
      pitchId: p.pitchId,
      displayOrder: p.displayOrder,
      label: p.label,
      formatHint: p.formatHint,
    })),
    cells: planung.cells,
    scheduleSections: planung.scheduleSections,
    participants: input.snapshot.participants.map((p) => ({
      participantId: p.participantId,
      displayName: p.displayName,
      crestUrl: p.crestUrl,
    })),
  });

  return {
    tournament: input.header,
    participants,
    spielplan,
    scheduleSections,
    mobileTimeline,
    groupStandings,
    publication: input.publication,
    publicPath: buildPublicTournamentPath(input.tenantKey, input.header.id),
    generatedAt: new Date().toISOString(),
  };
}
