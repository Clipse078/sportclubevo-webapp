/**
 * SCE-TOURNAMENT-PLANNER-02D — predefined programme template resolution for HOME creator.
 */

import { getRecommendedProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/template-registry";
import type { TournamentProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/types";
import type {
  TournamentComposerPitchDraft,
  TournamentComposerPlannerDraft,
} from "./tournament-composer-planner-types";

export type ComposerResolvedProgrammeTemplate = {
  template: TournamentProgrammeTemplate;
  fieldCountLabel: string;
  playingFormatSummary: string;
};

export type ComposerMainPauseDraft = {
  enabled: boolean;
  durationMinutes: number;
  afterRoundNumber: number;
};

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
  };
}

export function defaultComposerMainPauseForTemplate(
  template: TournamentProgrammeTemplate,
): ComposerMainPauseDraft {
  const hint = template.breakHints[0];
  return {
    enabled: true,
    durationMinutes: 10,
    afterRoundNumber: hint?.afterRoundNumber ?? 1,
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
      ? input.planner.mainPause
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
  breakAfterRoundNumbers: readonly number[];
  breakDurationMinutes: number;
}): number {
  if (input.roundCount < 1) return 0;
  const slotMinutes = input.matchDurationMinutes + input.transitionMinutes;
  const breakSet = new Set(input.breakAfterRoundNumbers);
  let cursor = 0;
  for (let roundIndex = 0; roundIndex < input.roundCount; roundIndex += 1) {
    cursor += slotMinutes;
    const roundNumber = roundIndex + 1;
    if (breakSet.has(roundNumber)) {
      cursor += input.breakDurationMinutes;
    }
  }
  return Math.max(0, cursor - input.transitionMinutes);
}

export type ComposerScheduleFitView = {
  status: "PASS" | "FAIL" | "INCOMPLETE";
  requiredMinutes: number | null;
  availableMinutes: number | null;
  reserveMinutes: number | null;
  deficitMinutes: number | null;
  headline: string;
  detail: string | null;
};

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
    };
  }

  const breakAfterRoundNumbers =
    input.planner.mainPause?.enabled === true
      ? [input.planner.mainPause.afterRoundNumber]
      : [];
  const breakDurationMinutes =
    input.planner.mainPause?.enabled === true ? input.planner.mainPause.durationMinutes : 0;

  const requiredMinutes = computeTemplateScheduleRequiredMinutes({
    roundCount,
    matchDurationMinutes: input.planner.timing.matchDurationMinutes,
    transitionMinutes: input.planner.timing.transitionMinutes,
    breakAfterRoundNumbers,
    breakDurationMinutes,
  });

  if (requiredMinutes <= availableMinutes) {
    const reserveMinutes = availableMinutes - requiredMinutes;
    return {
      status: "PASS",
      requiredMinutes,
      availableMinutes,
      reserveMinutes,
      deficitMinutes: null,
      headline: "Der Spielplan passt in die geplante Turnierzeit.",
      detail: `Benötigt: ${requiredMinutes} Min. · Verfügbar: ${availableMinutes} Min. · Reserve: ${reserveMinutes} Min.`,
    };
  }

  const deficitMinutes = requiredMinutes - availableMinutes;
  return {
    status: "FAIL",
    requiredMinutes,
    availableMinutes,
    reserveMinutes: null,
    deficitMinutes,
    headline: `Der Spielplan benötigt ${requiredMinutes} Min., verfügbar sind ${availableMinutes} Min.`,
    detail: `${deficitMinutes} Min. zu wenig Zeit.`,
  };
}
