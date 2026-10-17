/**
 * Groups assigned fixtures and breaks into ordered Planung schedule sections.
 */

import type {
  TournamentPlanungBoardCell,
  TournamentPlanungBreakBlock,
  TournamentPlanungFixtureBlock,
  TournamentPlanungScheduleSection,
} from "./types";
import {
  buildKnockoutMaxRoundIndexByStage,
  buildPlanungRoundSectionKey,
  buildPlanungRoundSectionTitle,
} from "./planung-round-labels";

type FixtureMeta = {
  id: string;
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  phaseLabel: string | null;
  groupLabel: string | null;
};

function formatTimeRange(startUtc: string, endUtc: string, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  };
  const start = new Date(startUtc).toLocaleTimeString("de-CH", opts);
  const end = new Date(endUtc).toLocaleTimeString("de-CH", opts);
  return `${start}–${end}`;
}

export function formatPlanungBreakScopeLabel(
  scope: "ALL_PITCHES" | "SELECTED_PITCHES",
  pitchLabels: readonly string[],
): string {
  if (scope === "ALL_PITCHES") return "Alle Felder";
  if (pitchLabels.length === 0) return "Ausgewählte Felder";
  return pitchLabels.join(", ");
}

export function buildPlanungScheduleSections(params: {
  fixtures: readonly FixtureMeta[];
  cells: readonly TournamentPlanungBoardCell[];
  pitchLabelById: ReadonlyMap<string, string>;
  timezone: string;
}): TournamentPlanungScheduleSection[] {
  const assignedFixtures = params.cells.filter(
    (c): c is TournamentPlanungFixtureBlock => c.kind === "FIXTURE" && c.assignmentId != null,
  );
  if (assignedFixtures.length === 0) return [];

  const fixtureMetaById = new Map(params.fixtures.map((f) => [f.id, f]));
  const knockoutMaxRound = buildKnockoutMaxRoundIndexByStage(params.fixtures);

  type SectionAcc = {
    sectionId: string;
    title: string;
    entries: TournamentPlanungBoardCell[];
    sortKey: number;
  };

  const sectionMap = new Map<string, SectionAcc>();

  for (const cell of assignedFixtures) {
    const meta = fixtureMetaById.get(cell.fixtureId);
    const sectionKey = meta
      ? buildPlanungRoundSectionKey(meta)
      : `unknown:${cell.fixtureId}`;
    const title = meta
      ? buildPlanungRoundSectionTitle(meta, knockoutMaxRound)
      : "Spiele";
    const sortKey = Date.parse(cell.startUtc);
    const existing = sectionMap.get(sectionKey);
    if (existing) {
      existing.entries.push(cell);
      existing.sortKey = Math.min(existing.sortKey, sortKey);
    } else {
      sectionMap.set(sectionKey, {
        sectionId: sectionKey,
        title,
        entries: [cell],
        sortKey,
      });
    }
  }

  const breakSections: SectionAcc[] = params.cells
    .filter((c): c is TournamentPlanungBreakBlock => c.kind === "BREAK")
    .map((br) => {
      const pitchLabels = br.pitchIds.map((id) => params.pitchLabelById.get(id) ?? "Feld");
      const scopeLabel = formatPlanungBreakScopeLabel(br.scope, pitchLabels);
      const timeRange = formatTimeRange(br.startUtc, br.endUtc, params.timezone);
      return {
        sectionId: `break:${br.breakId}`,
        title: "Pause",
        sortKey: Date.parse(br.startUtc),
        entries: [
          {
            ...br,
            accessibleLabel: `${timeRange} · ${br.label} · ${scopeLabel}`,
          },
        ],
      };
    });

  const sections = [...sectionMap.values(), ...breakSections].sort(
    (a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title, "de"),
  );

  for (const section of sections) {
    if (section.sectionId.startsWith("break:")) continue;
    section.entries.sort(
      (a, b) =>
        Date.parse(a.startUtc) - Date.parse(b.startUtc) ||
        (a.kind === "FIXTURE" && b.kind === "FIXTURE"
          ? a.pitchId.localeCompare(b.pitchId)
          : 0),
    );
  }

  return sections.map((section) => ({
    sectionId: section.sectionId,
    title: section.title,
    entries: section.entries,
  }));
}
