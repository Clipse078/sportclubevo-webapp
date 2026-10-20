import type { TournamentProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/types";
import type { RoundScheduledBreak } from "@/lib/tournament-scheduling/programme-templates/round-scheduled-breaks";
import type {
  TournamentComposerMainPauseDraft,
  TournamentComposerPlannerDraft,
  TournamentComposerScheduleRoundBreakDraft,
} from "./tournament-composer-planner-types";

export function createComposerScheduleRoundBreakDraft(input?: {
  localId?: string;
  afterRoundNumber?: number;
  durationMinutes?: number;
}): TournamentComposerScheduleRoundBreakDraft {
  return {
    localId: input?.localId ?? `schedule-break-${Date.now()}`,
    afterRoundNumber: input?.afterRoundNumber ?? 1,
    durationMinutes: input?.durationMinutes ?? 10,
  };
}

export function defaultComposerScheduleRoundBreaksForTemplate(
  template: TournamentProgrammeTemplate,
  defaultDurationMinutes = 10,
): TournamentComposerScheduleRoundBreakDraft[] {
  return template.breakHints.map((hint, index) => ({
    localId: `template-break-${hint.afterRoundNumber}-${index}`,
    afterRoundNumber: hint.afterRoundNumber,
    durationMinutes: defaultDurationMinutes,
  }));
}

/** Migrate legacy mainPause drafts into canonical round breaks when possible. */
export function migrateMainPauseToScheduleRoundBreaks(
  mainPause: TournamentComposerMainPauseDraft | undefined,
): TournamentComposerScheduleRoundBreakDraft[] {
  const normalized = mainPause;
  if (!normalized?.enabled || normalized.durationMinutes <= 0) {
    return [];
  }
  if (normalized.afterRoundNumber != null && normalized.afterRoundNumber >= 1) {
    return [
      createComposerScheduleRoundBreakDraft({
        localId: "migrated-main-pause",
        afterRoundNumber: normalized.afterRoundNumber,
        durationMinutes: normalized.durationMinutes,
      }),
    ];
  }
  return [];
}

export function normalizeComposerScheduleRoundBreaks(
  planner: Pick<TournamentComposerPlannerDraft, "scheduleRoundBreaks" | "mainPause">,
): TournamentComposerScheduleRoundBreakDraft[] {
  if (planner.scheduleRoundBreaks !== undefined) {
    return [...planner.scheduleRoundBreaks].sort(
      (a, b) => a.afterRoundNumber - b.afterRoundNumber,
    );
  }
  return migrateMainPauseToScheduleRoundBreaks(planner.mainPause);
}

export function resolveCanonicalScheduleRoundBreaks(
  planner: Pick<TournamentComposerPlannerDraft, "scheduleRoundBreaks" | "mainPause">,
): RoundScheduledBreak[] {
  return normalizeComposerScheduleRoundBreaks(planner).map((row) => ({
    afterRoundNumber: row.afterRoundNumber,
    durationMinutes: row.durationMinutes,
  }));
}

export function validateComposerScheduleRoundBreaks(input: {
  breaks: readonly TournamentComposerScheduleRoundBreakDraft[];
  roundCount: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const maxAfterRound = Math.max(0, input.roundCount - 1);
  const seenAfterRound = new Set<number>();

  for (const br of input.breaks) {
    const key = `scheduleRoundBreak-${br.localId}`;
    if (br.durationMinutes <= 0) {
      errors[key] = "Pausendauer muss positiv sein.";
    }
    if (input.roundCount < 2) {
      errors[key] = "Mit weniger als zwei Runden ist keine Pause zwischen Runden möglich.";
      continue;
    }
    if (br.afterRoundNumber < 1 || br.afterRoundNumber > maxAfterRound) {
      errors[key] =
        maxAfterRound === 1
          ? "Pause nur nach Runde 1 möglich."
          : `Nach Runde muss zwischen 1 und ${maxAfterRound} liegen.`;
    }
    if (seenAfterRound.has(br.afterRoundNumber)) {
      errors[key] = "Pro Runde ist höchstens eine Pause erlaubt.";
    }
    seenAfterRound.add(br.afterRoundNumber);
  }

  return errors;
}

export function mergePlannerScheduleRoundBreaks(
  planner: TournamentComposerPlannerDraft,
): TournamentComposerPlannerDraft {
  const migrated = migrateMainPauseToScheduleRoundBreaks(planner.mainPause);
  if (planner.scheduleRoundBreaks !== undefined) {
    return { ...planner, mainPause: undefined };
  }
  if (migrated.length === 0) {
    return { ...planner, mainPause: undefined };
  }
  return {
    ...planner,
    scheduleRoundBreaks: migrated,
    mainPause: undefined,
  };
}
