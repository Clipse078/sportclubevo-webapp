import { resolveComposerBreakDateTimes } from "./tournament-composer-planner-breaks";
import type { TournamentComposerMainPauseDraft } from "./tournament-composer-planner-types";

export function normalizeComposerMainPauseDraft(
  raw: TournamentComposerMainPauseDraft | undefined,
): TournamentComposerMainPauseDraft {
  return {
    enabled: raw?.enabled ?? false,
    durationMinutes: raw?.durationMinutes ?? 10,
    startLocalTime: raw?.startLocalTime ?? "",
    afterRoundNumber: raw?.afterRoundNumber,
  };
}

export function resolveComposerMainPauseUtcWindow(input: {
  mainPause: TournamentComposerMainPauseDraft | undefined;
  tournamentStartAt: string;
  tournamentEndAt: string;
  timeZone?: string;
}): { startUtcMs: number; endUtcMs: number } | null {
  const mainPause = normalizeComposerMainPauseDraft(input.mainPause);
  if (!mainPause.enabled || mainPause.durationMinutes <= 0 || !mainPause.startLocalTime.trim()) {
    return null;
  }
  const interval = resolveComposerBreakDateTimes(
    {
      localId: "main-pause",
      label: "Pause",
      startLocalTime: mainPause.startLocalTime,
      durationMinutes: mainPause.durationMinutes,
      scope: "ALL_PITCHES",
      tournamentPitchLocalIds: [],
      fieldSelectionAdvanced: false,
    },
    input.tournamentStartAt,
    input.timeZone,
  );
  if (!interval) {
    return null;
  }
  const startUtcMs = new Date(interval.startAt).getTime();
  const endUtcMs = new Date(interval.endAt).getTime();
  if (Number.isNaN(startUtcMs) || Number.isNaN(endUtcMs) || endUtcMs <= startUtcMs) {
    return null;
  }
  return { startUtcMs, endUtcMs };
}

export function validateComposerMainPauseWindow(input: {
  mainPause: TournamentComposerMainPauseDraft | undefined;
  tournamentStartAt: string;
  tournamentEndAt: string;
  timeZone?: string;
}): string | null {
  const mainPause = normalizeComposerMainPauseDraft(input.mainPause);
  if (!mainPause.enabled) {
    return null;
  }
  if (!mainPause.startLocalTime.trim()) {
    return "Bitte Pausenbeginn angeben.";
  }
  if (mainPause.durationMinutes <= 0) {
    return "Pausendauer muss positiv sein.";
  }
  if (!input.tournamentStartAt || !input.tournamentEndAt) {
    return "Turnierzeitfenster fehlt für die Pausenprüfung.";
  }
  const window = resolveComposerMainPauseUtcWindow(input);
  if (!window) {
    return "Pausenbeginn ist ungültig.";
  }
  const tournamentStartMs = new Date(input.tournamentStartAt).getTime();
  const tournamentEndMs = new Date(input.tournamentEndAt).getTime();
  if (
    Number.isNaN(tournamentStartMs) ||
    Number.isNaN(tournamentEndMs) ||
    tournamentEndMs <= tournamentStartMs
  ) {
    return "Turnierzeitfenster ist unvollständig.";
  }
  if (window.startUtcMs < tournamentStartMs) {
    return "Pausenbeginn liegt vor Turnierbeginn.";
  }
  if (window.startUtcMs >= tournamentEndMs) {
    return "Pausenbeginn liegt nach Turnierende.";
  }
  if (window.endUtcMs > tournamentEndMs) {
    return "Pause endet nach Turnierende — bitte Beginn oder Dauer anpassen.";
  }
  return null;
}
