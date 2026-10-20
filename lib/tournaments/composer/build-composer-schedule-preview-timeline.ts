import type {
  ComposerSchedulePreviewFixtureRow,
  ComposerSchedulePreviewRound,
} from "./tournament-composer-schedule-preview";

export type ComposerSchedulePreviewBreakTimelineItem = {
  kind: "BREAK";
  breakKey: string;
  startUtcMs: number;
  endUtcMs: number;
  timeRangeLabel: string;
  durationMinutes: number;
  label: string;
};

export type ComposerSchedulePreviewRoundTimelineItem = {
  kind: "ROUND";
  roundNumber: number;
  roundStartUtcMs: number;
  roundStartLabel: string;
  fixtures: ComposerSchedulePreviewFixtureRow[];
};

export type ComposerSchedulePreviewTimelineItem =
  | ComposerSchedulePreviewRoundTimelineItem
  | ComposerSchedulePreviewBreakTimelineItem;

function formatClockRangeFromUtcMs(startUtcMs: number, endUtcMs: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = new Date(startUtcMs);
  const end = new Date(endUtcMs);
  const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${fmt(start)}–${fmt(end)}`;
}

export type ComposerSchedulePreviewBreakInput = {
  breakKey: string;
  startUtcMs: number;
  endUtcMs: number;
  durationMinutes: number;
  label?: string;
};

/**
 * Single ordered Spielplan timeline — rounds and pauses sorted by authoritative schedule times.
 */
export function buildComposerSchedulePreviewTimeline(input: {
  rounds: readonly ComposerSchedulePreviewRound[];
  breaks?: readonly ComposerSchedulePreviewBreakInput[];
  /** @deprecated R11 — use breaks array. */
  fixedPause?: { startUtcMs: number; endUtcMs: number; durationMinutes: number } | null;
}): ComposerSchedulePreviewTimelineItem[] {
  const sortable: Array<{ sortMs: number; order: number; item: ComposerSchedulePreviewTimelineItem }> =
    [];

  for (const round of input.rounds) {
    sortable.push({
      sortMs: round.roundStartUtcMs,
      order: 0,
      item: {
        kind: "ROUND",
        roundNumber: round.roundNumber,
        roundStartUtcMs: round.roundStartUtcMs,
        roundStartLabel: round.roundStartLabel,
        fixtures: round.fixtures,
      },
    });
  }

  const breakRows: ComposerSchedulePreviewBreakInput[] = input.breaks
    ? [...input.breaks]
    : input.fixedPause
      ? [
          {
            breakKey: `pause-${input.fixedPause.startUtcMs}`,
            startUtcMs: input.fixedPause.startUtcMs,
            endUtcMs: input.fixedPause.endUtcMs,
            durationMinutes: input.fixedPause.durationMinutes,
            label: "Pause",
          },
        ]
      : [];

  for (const br of breakRows) {
    sortable.push({
      sortMs: br.startUtcMs,
      order: 1,
      item: {
        kind: "BREAK",
        breakKey: br.breakKey,
        startUtcMs: br.startUtcMs,
        endUtcMs: br.endUtcMs,
        timeRangeLabel: formatClockRangeFromUtcMs(br.startUtcMs, br.endUtcMs),
        durationMinutes: br.durationMinutes,
        label: br.label ?? "Pause",
      },
    });
  }

  sortable.sort((a, b) => a.sortMs - b.sortMs || a.order - b.order);
  return sortable.map((row) => row.item);
}
