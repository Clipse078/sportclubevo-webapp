/**
 * SCE-TOURNAMENT-PLANNER-02D — predefined programme template resolution for HOME creator.
 */

import {
  computeProgrammeRequiredMinutesFromTimeline,
  computeRoundParallelScheduleTimeline,
} from "@/lib/tournament-scheduling/programme-templates/fixed-pause-round-scheduling";
import { getRecommendedProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/template-registry";
import type { TournamentProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/types";
import {
  normalizeComposerMainPauseDraft,
  resolveComposerMainPauseUtcWindow,
  validateComposerMainPauseWindow,
} from "./tournament-composer-main-pause";
import type {
  TournamentComposerPitchDraft,
  TournamentComposerPlannerDraft,
} from "./tournament-composer-planner-types";

export type ComposerResolvedProgrammeTemplate = {
  template: TournamentProgrammeTemplate;
  fieldCountLabel: string;
  playingFormatSummary: string;
  statusHeadline: string;
  statusDetail: string;
};

export type ComposerMainPauseDraft = {
  enabled: boolean;
  durationMinutes: number;
  startLocalTime: string;
  afterRoundNumber?: number;
};

/** Curated templates key off tournament participants — never playing-unit splits. */
export function countComposerCuratedTemplateParticipants(
  participants: readonly unknown[],
): number {
  return participants.length;
}

export function summarizeTemplatePlayingFormats(template: TournamentProgrammeTemplate): string {
  return template.fields
    .map((f) => `${f.label} · ${f.playingFormat.playersPerSide}v${f.playingFormat.playersPerSide}`)
    .join(", ");
}

export function resolveComposerProgrammeTemplate(participantCount: number): ComposerResolvedProgrammeTemplate | null {
  if (participantCount < 2) return null;
  const template = getRecommendedProgrammeTemplate({ participantCount });
  if (!template) return null;
  return {
    template,
    fieldCountLabel: `Dieser Spielplan benötigt ${template.fields.length} Spielfelder.`,
    playingFormatSummary: summarizeTemplatePlayingFormats(template),
    statusHeadline: "Vordefinierter Spielplan",
    statusDetail: `${template.participantCount} Teams · Rotation`,
  };
}

export function defaultComposerMainPauseForTemplate(
  _template: TournamentProgrammeTemplate,
): ComposerMainPauseDraft {
  return {
    enabled: true,
    durationMinutes: 10,
    startLocalTime: "",
  };
}

export function materializeComposerPitchesFromTemplate(
  template: TournamentProgrammeTemplate,
  previous?: readonly TournamentComposerPitchDraft[],
): TournamentComposerPitchDraft[] {
  const sorted = [...template.fields].sort((a, b) => a.displayOrder - b.displayOrder);
  const previousByKey = new Map(
    (previous ?? [])
      .filter((p) => p.templateFieldKey)
      .map((p) => [p.templateFieldKey!, p] as const),
  );
  return sorted.map((field) => {
    const prev = previousByKey.get(field.fieldKey);
    return {
      localId: prev?.localId ?? `pitch-template-${field.fieldKey}`,
      templateFieldKey: field.fieldKey,
      label: prev?.label?.trim() ? prev.label : field.label,
      playersPerSide: field.playingFormat.playersPerSide,
      userLabelCustomized: prev?.userLabelCustomized ?? false,
    };
  });
}

export function reconcileComposerPlannerForParticipants(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
}): TournamentComposerPlannerDraft {
  const resolved = resolveComposerProgrammeTemplate(input.participantCount);
  if (!resolved) {
    return {
      ...input.planner,
      programmeTemplateId: null,
      programmeTemplateVersion: null,
    };
  }

  const templateChanged =
    input.planner.programmeTemplateId !== resolved.template.id ||
    input.planner.programmeTemplateVersion !== resolved.template.version;

  const mainPause =
    input.planner.mainPause && !templateChanged
      ? normalizeComposerMainPauseDraft(input.planner.mainPause)
      : defaultComposerMainPauseForTemplate(resolved.template);

  const pitches = materializeComposerPitchesFromTemplate(
    resolved.template,
    templateChanged ? undefined : input.planner.pitches,
  );

  return {
    ...input.planner,
    programmeTemplateId: resolved.template.id,
    programmeTemplateVersion: resolved.template.version,
    competitionFormat: "GROUP_MIX_ONLY",
    groupMixStrategy: "ROUND_ROBIN",
    groupCount: 1,
    mainPause,
    pitches,
  };
}

export function computeTemplateScheduleRequiredMinutes(input: {
  roundCount: number;
  matchDurationMinutes: number;
  transitionMinutes: number;
  tournamentStartUtcMs: number;
  fixedPause: { startUtcMs: number; endUtcMs: number } | null;
}): number {
  const timeline = computeRoundParallelScheduleTimeline({
    tournamentStartUtcMs: input.tournamentStartUtcMs,
    roundCount: input.roundCount,
    matchDurationMinutes: input.matchDurationMinutes,
    transitionMinutes: input.transitionMinutes,
    fixedPause: input.fixedPause,
  });
  return computeProgrammeRequiredMinutesFromTimeline({
    tournamentStartUtcMs: input.tournamentStartUtcMs,
    programmeEndUtcMs: timeline.programmeEndUtcMs,
  });
}

export type ComposerScheduleFitView = {
  status: "PASS" | "FAIL" | "INCOMPLETE";
  requiredMinutes: number | null;
  availableMinutes: number | null;
  reserveMinutes: number | null;
  deficitMinutes: number | null;
  headline: string;
  detail: string | null;
  requiredEndLabel: string | null;
  tournamentEndLabel: string | null;
};

function formatClockFromUtcMs(utcMs: number): string {
  const d = new Date(utcMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function buildComposerScheduleFitView(input: {
  participantCount: number;
  startAt: string;
  endAt: string;
  planner: TournamentComposerPlannerDraft;
}): ComposerScheduleFitView {
  if (!input.startAt || !input.endAt) {
    return {
      status: "INCOMPLETE",
      requiredMinutes: null,
      availableMinutes: null,
      reserveMinutes: null,
      deficitMinutes: null,
      headline: "Lege Start- und Endzeit im Schritt Termin fest.",
      detail: null,
      requiredEndLabel: null,
      tournamentEndLabel: null,
    };
  }
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return {
      status: "INCOMPLETE",
      requiredMinutes: null,
      availableMinutes: null,
      reserveMinutes: null,
      deficitMinutes: null,
      headline: "Turnierzeitfenster ist unvollständig.",
      detail: null,
      requiredEndLabel: null,
      tournamentEndLabel: null,
    };
  }

  const pauseError = validateComposerMainPauseWindow({
    mainPause: input.planner.mainPause,
    tournamentStartAt: input.startAt,
    tournamentEndAt: input.endAt,
  });
  if (pauseError) {
    return {
      status: "INCOMPLETE",
      requiredMinutes: null,
      availableMinutes: Math.round((end.getTime() - start.getTime()) / 60_000),
      reserveMinutes: null,
      deficitMinutes: null,
      headline: pauseError,
      detail: null,
      requiredEndLabel: null,
      tournamentEndLabel: formatClockFromUtcMs(end.getTime()),
    };
  }

  const availableMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const resolved = resolveComposerProgrammeTemplate(input.participantCount);
  const roundCount = resolved?.template.rounds.length ?? 0;
  if (roundCount < 1) {
    return {
      status: "INCOMPLETE",
      requiredMinutes: null,
      availableMinutes,
      reserveMinutes: null,
      deficitMinutes: null,
      headline: "Kein vordefinierter Spielplan für diese Teilnehmerzahl — TP01-Fallback nach Erstellung.",
      detail: null,
      requiredEndLabel: null,
      tournamentEndLabel: formatClockFromUtcMs(end.getTime()),
    };
  }

  const fixedPause = resolveComposerMainPauseUtcWindow({
    mainPause: input.planner.mainPause,
    tournamentStartAt: input.startAt,
    tournamentEndAt: input.endAt,
  });

  const timeline = computeRoundParallelScheduleTimeline({
    tournamentStartUtcMs: start.getTime(),
    roundCount,
    matchDurationMinutes: input.planner.timing.matchDurationMinutes,
    transitionMinutes: input.planner.timing.transitionMinutes,
    fixedPause,
  });

  const requiredMinutes = computeProgrammeRequiredMinutesFromTimeline({
    tournamentStartUtcMs: start.getTime(),
    programmeEndUtcMs: timeline.programmeEndUtcMs,
  });
  const requiredEndLabel = formatClockFromUtcMs(timeline.programmeEndUtcMs);
  const tournamentEndLabel = formatClockFromUtcMs(end.getTime());

  if (requiredMinutes <= availableMinutes) {
    const reserveMinutes = availableMinutes - requiredMinutes;
    return {
      status: "PASS",
      requiredMinutes,
      availableMinutes,
      reserveMinutes,
      deficitMinutes: null,
      headline: "Der Spielplan passt in die geplante Turnierzeit.",
      detail: `Benötigt bis: ${requiredEndLabel}\nTurnierende: ${tournamentEndLabel}\nReserve: ${reserveMinutes} Min.`,
      requiredEndLabel,
      tournamentEndLabel,
    };
  }

  const deficitMinutes = requiredMinutes - availableMinutes;
  return {
    status: "FAIL",
    requiredMinutes,
    availableMinutes,
    reserveMinutes: null,
    deficitMinutes,
    headline: "Der Spielplan passt nicht in die geplante Turnierzeit.",
    detail: `Benötigt bis: ${requiredEndLabel}\nTurnierende: ${tournamentEndLabel}\nFehlend: ${deficitMinutes} Min.`,
    requiredEndLabel,
    tournamentEndLabel,
  };
}
