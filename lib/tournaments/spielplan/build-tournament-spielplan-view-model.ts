/**
 * Pure projection: Planung board cells → Master + Team Spielplan view models.
 */

import type {
  TournamentPlanungBoardCell,
  TournamentPlanungFixtureBlock,
  TournamentPlanungScheduleSection,
} from "@/lib/tournaments/planung/types";
import { formatPlanungBreakScopeLabel } from "@/lib/tournaments/planung/planung-schedule-sections";
import type {
  TournamentSpielplanFixturePresentation,
  TournamentSpielplanIdentity,
  TournamentSpielplanMatrixRow,
  TournamentSpielplanMobileSlot,
  TournamentSpielplanPitchCell,
  TournamentSpielplanPitchColumn,
  TournamentSpielplanTeamEntry,
  TournamentSpielplanTeamPlan,
  TournamentSpielplanViewModel,
} from "./types";
import { buildSpielplanPresentationItems } from "./build-spielplan-presentation-items";

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function formatTimeRange(startUtc: string, endUtc: string, timezone: string): string {
  return `${formatTime(startUtc, timezone)}–${formatTime(endUtc, timezone)}`;
}

function formatDateLabel(startAtIso: string, timezone: string): string {
  return new Date(startAtIso).toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  });
}

function buildRoundTitleByFixtureId(
  sections: readonly TournamentPlanungScheduleSection[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const section of sections) {
    if (section.sectionId.startsWith("break:")) continue;
    for (const entry of section.entries) {
      if (entry.kind === "FIXTURE") {
        map.set(entry.fixtureId, section.title);
      }
    }
  }
  return map;
}

function pairingLabel(sideA: string, sideB: string): string {
  return `${sideA} – ${sideB}`;
}

function fixtureResult(cell: TournamentPlanungFixtureBlock): { scoreSideA: number; scoreSideB: number } | null {
  if (cell.result?.state !== "COMPLETED") return null;
  if (cell.result.scoreSideA == null || cell.result.scoreSideB == null) return null;
  return { scoreSideA: cell.result.scoreSideA, scoreSideB: cell.result.scoreSideB };
}

function mapFixturePresentation(
  cell: TournamentPlanungFixtureBlock,
  pitchLabel: string,
  roundTitle: string | null,
): TournamentSpielplanFixturePresentation {
  const result = fixtureResult(cell);
  return {
    fixtureId: cell.fixtureId,
    sideALabel: cell.sideA.label,
    sideBLabel: cell.sideB.label,
    sideAParticipantId: cell.sideA.participantId,
    sideBParticipantId: cell.sideB.participantId,
    sideAIsPlaceholder: cell.sideA.isPlaceholder,
    sideBIsPlaceholder: cell.sideB.isPlaceholder,
    pairingLabel: pairingLabel(cell.sideA.label, cell.sideB.label),
    startUtc: cell.startUtc,
    endUtc: cell.endUtc,
    pitchId: cell.pitchId,
    pitchLabel,
    roundTitle,
    result,
  };
}

function pitchCellFromFixture(
  cell: TournamentPlanungFixtureBlock,
): TournamentSpielplanPitchCell {
  const result = fixtureResult(cell);
  return {
    kind: "FIXTURE",
    fixtureId: cell.fixtureId,
    pairingLabel: pairingLabel(cell.sideA.label, cell.sideB.label),
    sideAParticipantId: cell.sideA.participantId,
    sideBParticipantId: cell.sideB.participantId,
    result,
  };
}

function breakOverlapsInstant(
  startUtc: string,
  endUtc: string,
  instantUtc: string,
): boolean {
  const t = Date.parse(instantUtc);
  return Date.parse(startUtc) <= t && t < Date.parse(endUtc);
}

export function buildTournamentSpielplanViewModel(input: {
  identity: Omit<TournamentSpielplanIdentity, "dateLabel"> & { startAtIso: string };
  pitches: readonly { pitchId: string; displayOrder: number; label: string }[];
  cells: readonly TournamentPlanungBoardCell[];
  scheduleSections: readonly TournamentPlanungScheduleSection[];
  participants: readonly {
    participantId: string;
    displayName: string;
    crestUrl: string | null;
  }[];
}): TournamentSpielplanViewModel {
  const timezone = input.identity.timezone;
  const sortedPitches: TournamentSpielplanPitchColumn[] = [...input.pitches]
    .map((p) => ({
      pitchId: p.pitchId,
      displayOrder: p.displayOrder,
      label: p.label,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.pitchId.localeCompare(b.pitchId));

  const pitchLabelById = new Map(sortedPitches.map((p) => [p.pitchId, p.label]));
  const roundByFixture = buildRoundTitleByFixtureId(input.scheduleSections);

  const assignedFixtures = input.cells.filter(
    (c): c is TournamentPlanungFixtureBlock =>
      c.kind === "FIXTURE" && c.assignmentId != null,
  );
  const breakCells = input.cells.filter((c) => c.kind === "BREAK");

  const fixtures = assignedFixtures.map((cell) =>
    mapFixturePresentation(
      cell,
      pitchLabelById.get(cell.pitchId) ?? "Feld",
      roundByFixture.get(cell.fixtureId) ?? null,
    ),
  );

  const rowStartTimes = new Set<string>();
  for (const f of assignedFixtures) rowStartTimes.add(f.startUtc);
  for (const b of breakCells) rowStartTimes.add(b.startUtc);

  const sortedStarts = [...rowStartTimes].sort((a, b) => Date.parse(a) - Date.parse(b));

  const matrixRows: TournamentSpielplanMatrixRow[] = [];
  const mobileSlots: TournamentSpielplanMobileSlot[] = [];

  for (const startUtc of sortedStarts) {
    const allPitchBreak = breakCells.find(
      (b) => b.scope === "ALL_PITCHES" && b.startUtc === startUtc,
    );
    if (allPitchBreak) {
      const timeLabel = formatTimeRange(allPitchBreak.startUtc, allPitchBreak.endUtc, timezone);
      matrixRows.push({
        kind: "ALL_PITCHES_BREAK",
        rowId: `break-all:${allPitchBreak.breakId}:${startUtc}`,
        startUtc: allPitchBreak.startUtc,
        endUtc: allPitchBreak.endUtc,
        timeLabel,
        label: allPitchBreak.label,
      });
      mobileSlots.push({
        slotId: `break-all:${allPitchBreak.breakId}`,
        startUtc: allPitchBreak.startUtc,
        timeLabel: formatTime(startUtc, timezone),
        roundTitle: null,
        kind: "ALL_PITCHES_BREAK",
        breakLabel: allPitchBreak.label,
        pitches: [],
      });
    }

    const fixturesAtSlot = assignedFixtures.filter((f) => f.startUtc === startUtc);
    const selectedBreaksAtSlot = breakCells.filter(
      (b) =>
        b.scope === "SELECTED_PITCHES" &&
        breakOverlapsInstant(b.startUtc, b.endUtc, startUtc),
    );

    if (fixturesAtSlot.length === 0 && !allPitchBreak && selectedBreaksAtSlot.length === 0) {
      continue;
    }

    if (fixturesAtSlot.length > 0 || selectedBreaksAtSlot.length > 0) {
      const cellsByPitchId: Record<string, TournamentSpielplanPitchCell> = {};
      const mobilePitchEntries: Array<TournamentSpielplanMobileSlot["pitches"][number]> = [];

      for (const pitch of sortedPitches) {
        const fixture = fixturesAtSlot.find((f) => f.pitchId === pitch.pitchId);
        const pitchBreak = selectedBreaksAtSlot.find((b) => b.pitchIds.includes(pitch.pitchId));

        let cell: TournamentSpielplanPitchCell;
        if (fixture) {
          cell = pitchCellFromFixture(fixture);
        } else if (pitchBreak) {
          cell = { kind: "PITCH_BLOCKED", label: pitchBreak.label };
        } else {
          cell = { kind: "EMPTY" };
        }
        cellsByPitchId[pitch.pitchId] = cell;
        if (cell.kind !== "EMPTY") {
          mobilePitchEntries.push({ pitchLabel: pitch.label, cell });
        }
      }

      const roundTitles = [
        ...new Set(
          fixturesAtSlot
            .map((f) => roundByFixture.get(f.fixtureId))
            .filter((t): t is string => Boolean(t)),
        ),
      ];
      const roundTitle = roundTitles.length === 1 ? roundTitles[0]! : roundTitles.join(" · ") || null;

      matrixRows.push({
        kind: "SCHEDULE_SLOT",
        rowId: `slot:${startUtc}`,
        startUtc,
        timeLabel: formatTime(startUtc, timezone),
        roundTitle,
        cellsByPitchId,
      });

      if (mobilePitchEntries.length > 0) {
        mobileSlots.push({
          slotId: `slot:${startUtc}`,
          startUtc,
          timeLabel: formatTime(startUtc, timezone),
          roundTitle,
          kind: "FIXTURES",
          pitches: mobilePitchEntries,
        });
      }
    }
  }

  const allPitchBreaks = breakCells.filter((b) => b.scope === "ALL_PITCHES");

  const teamPlans: TournamentSpielplanTeamPlan[] = input.participants.map((participant) => {
    const participantFixtures = fixtures.filter(
      (f) =>
        f.sideAParticipantId === participant.participantId ||
        f.sideBParticipantId === participant.participantId,
    );

    const timeline: TournamentSpielplanTeamEntry[] = [];

    for (const br of allPitchBreaks) {
      timeline.push({
        kind: "BREAK",
        startUtc: br.startUtc,
        timeLabel: formatTimeRange(br.startUtc, br.endUtc, timezone),
        label: br.label,
        scopeLabel: formatPlanungBreakScopeLabel(
          br.scope,
          br.pitchIds.map((id) => pitchLabelById.get(id) ?? "Feld"),
        ),
      });
    }

    for (const match of participantFixtures) {
      const isSideA = match.sideAParticipantId === participant.participantId;
      const opponentLabel = isSideA ? match.sideBLabel : match.sideALabel;
      const result = match.result;
      const scoreLabel = result ? `${result.scoreSideA}:${result.scoreSideB}` : null;
      timeline.push({
        kind: "MATCH",
        fixtureId: match.fixtureId,
        startUtc: match.startUtc,
        timeLabel: formatTime(match.startUtc, timezone),
        pitchLabel: match.pitchLabel,
        opponentLabel,
        roundTitle: match.roundTitle,
        result,
        scoreLabel,
      });
    }

    timeline.sort(
      (a, b) =>
        Date.parse(a.startUtc) - Date.parse(b.startUtc) ||
        (a.kind === "BREAK" ? -1 : 0) - (b.kind === "BREAK" ? -1 : 0),
    );

    return {
      participantId: participant.participantId,
      displayName: participant.displayName,
      crestUrl: participant.crestUrl,
      entries: timeline,
    };
  });

  const presentationItems = buildSpielplanPresentationItems({
    scheduleSections: input.scheduleSections,
    fixtures,
    timezone,
    pitchLabelById: new Map(sortedPitches.map((p) => [p.pitchId, p.label])),
  });

  return {
    identity: {
      ...input.identity,
      dateLabel: formatDateLabel(input.identity.startAtIso, timezone),
    },
    pitches: sortedPitches,
    fixtures,
    matrixRows,
    mobileSlots,
    presentationItems,
    participants: input.participants.map((p) => ({
      participantId: p.participantId,
      displayName: p.displayName,
      crestUrl: p.crestUrl,
    })),
    teamPlans,
  };
}

export function buildTournamentSpielplanFromPlanung(input: {
  tournamentId: string;
  title: string;
  startAtIso: string;
  location: string | null;
  organizerName: string | null;
  tenantName: string | null;
  tenantLogoUrl: string | null;
  timezone: string;
  pitches: readonly { pitchId: string; displayOrder: number; label: string }[];
  cells: readonly TournamentPlanungBoardCell[];
  scheduleSections: readonly TournamentPlanungScheduleSection[];
  participants: readonly {
    participantId: string;
    displayName: string;
    crestUrl: string | null;
  }[];
}): TournamentSpielplanViewModel {
  return buildTournamentSpielplanViewModel({
    identity: {
      tournamentId: input.tournamentId,
      title: input.title,
      startAtIso: input.startAtIso,
      location: input.location,
      organizerName: input.organizerName,
      tenantName: input.tenantName,
      tenantLogoUrl: input.tenantLogoUrl,
      timezone: input.timezone,
    },
    pitches: input.pitches,
    cells: input.cells,
    scheduleSections: input.scheduleSections,
    participants: input.participants,
  });
}

export function resolveTeamSpielplan(
  model: TournamentSpielplanViewModel,
  participantId: string,
): TournamentSpielplanTeamPlan | null {
  return model.teamPlans.find((p) => p.participantId === participantId) ?? null;
}
