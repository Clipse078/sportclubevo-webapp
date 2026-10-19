/**
 * SCE-TOURNAMENT-PLANNER-02D — category-aware programme proposals for HOME creator.
 * SCE proposes; user-adjusted pitch configuration is preserved across hydrate/navigation.
 */

import {
  computeProgrammeRequiredMinutesFromTimeline,
  computeRoundParallelScheduleTimeline,
} from "@/lib/tournament-scheduling/programme-templates/fixed-pause-round-scheduling";
import type { TournamentProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/types";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import {
  normalizeComposerMainPauseDraft,
  resolveComposerMainPauseUtcWindow,
  validateComposerMainPauseWindow,
} from "./tournament-composer-main-pause";
import type {
  TournamentComposerPitchDraft,
  TournamentComposerPlannerDraft,
} from "./tournament-composer-planner-types";
import {
  buildComposerProposalFingerprint,
  composerPitchDraftNeedsProposalMaterialisation,
  fieldProposalSignatureForProposal,
  isGenericDefaultComposerPitchDraft,
  materializeComposerPitchesFromFieldProposal,
  resolveComposerProgrammeProposal,
  summarizeComposerPitchAllocation,
  type ComposerProgrammeProposal,
} from "./tournament-composer-programme-proposal";

export type ComposerResolvedProgrammeTemplate = {
  proposal: ComposerProgrammeProposal;
  proposedFieldCount: number;
  fieldCountLabel: string;
  playingFormatSummary: string;
  statusHeadline: string;
  statusDetail: string;
  allocationSummaryLines: string[];
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

export function resolveComposerProgrammeTemplate(input: {
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
}): ComposerResolvedProgrammeTemplate | null {
  const proposal = resolveComposerProgrammeProposal({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  if (proposal.kind === "NONE") return null;

  const allocation = proposal.template
    ? {
        fieldCount: proposal.template.fields.length,
        formatLines: summarizeComposerPitchAllocation(
          materializeComposerPitchesFromTemplate(proposal.template),
        ).formatLines,
      }
    : proposal.fieldProposalPlayersPerSide
      ? summarizeComposerPitchAllocation(
          materializeComposerPitchesFromFieldProposal({
            playersPerSide: proposal.fieldProposalPlayersPerSide,
          }),
        )
      : { fieldCount: 0, formatLines: [] };

  const roundHint =
    proposal.kind === "FULL_TEMPLATE" && proposal.template
      ? ` · ${proposal.template.rounds.length} Runden`
      : "";

  return {
    proposal,
    fieldCountLabel:
      proposal.kind === "FULL_TEMPLATE"
        ? `Vorschlag: ${allocation.fieldCount} Spielfelder${roundHint}`
        : `Vorschlag: ${allocation.fieldCount} Spielfelder`,
    playingFormatSummary: allocation.formatLines.join(" · "),
    statusHeadline: "Empfohlene Aufteilung",
    statusDetail:
      proposal.kind === "FULL_TEMPLATE"
        ? "SCE hat für die ausgewählten Teams einen passenden Spielplan vorbereitet."
        : "SCE schlägt eine bewährte Feldaufteilung vor — der Spielplan entsteht daraus automatisch.",
    proposedFieldCount: allocation.fieldCount,
    allocationSummaryLines: allocation.formatLines,
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
      label: prev?.userLabelCustomized && prev.label.trim() ? prev.label : field.label,
      playersPerSide: field.playingFormat.playersPerSide,
      userLabelCustomized: prev?.userLabelCustomized ?? false,
    };
  });
}

function materializePitchesFromProposal(
  proposal: ComposerProgrammeProposal,
  previous?: readonly TournamentComposerPitchDraft[],
): TournamentComposerPitchDraft[] {
  if (proposal.kind === "FULL_TEMPLATE" && proposal.template) {
    return materializeComposerPitchesFromTemplate(proposal.template, previous);
  }
  if (proposal.kind === "FIELD_PROPOSAL_ONLY" && proposal.fieldProposalPlayersPerSide) {
    return materializeComposerPitchesFromFieldProposal({
      playersPerSide: proposal.fieldProposalPlayersPerSide,
      previous,
    });
  }
  return previous ? [...previous] : [];
}

function proposalTemplateIdentity(proposal: ComposerProgrammeProposal): {
  programmeTemplateId: string | null;
  programmeTemplateVersion: number | null;
  fieldProposalSignature: string | null;
} {
  if (proposal.kind === "FULL_TEMPLATE" && proposal.template) {
    return {
      programmeTemplateId: proposal.template.id,
      programmeTemplateVersion: proposal.template.version,
      fieldProposalSignature: null,
    };
  }
  return {
    programmeTemplateId: null,
    programmeTemplateVersion: null,
    fieldProposalSignature: fieldProposalSignatureForProposal(proposal),
  };
}

function buildFingerprintForProposal(
  proposal: ComposerProgrammeProposal,
  participantCount: number,
  categoryContext: ProgrammeTemplateCategoryContext | null,
): string {
  const identity = proposalTemplateIdentity(proposal);
  return buildComposerProposalFingerprint({
    categoryContext,
    participantCount,
    templateId: identity.programmeTemplateId,
    templateVersion: identity.programmeTemplateVersion,
    fieldProposalSignature: identity.fieldProposalSignature,
  });
}

export function restoreComposerProgrammeProposal(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
}): TournamentComposerPlannerDraft {
  const proposal = resolveComposerProgrammeProposal({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  if (proposal.kind === "NONE") {
    return {
      ...input.planner,
      pitchesUserCustomized: false,
      pendingProposalRefresh: null,
      programmeProposalCategoryContext: input.categoryContext,
      programmeProposalFingerprint: null,
      programmeTemplateId: null,
      programmeTemplateVersion: null,
    };
  }
  const identity = proposalTemplateIdentity(proposal);
  const fingerprint = buildFingerprintForProposal(
    proposal,
    input.participantCount,
    input.categoryContext,
  );
  const mainPause =
    proposal.kind === "FULL_TEMPLATE" && proposal.template
      ? defaultComposerMainPauseForTemplate(proposal.template)
      : input.planner.mainPause;
  return {
    ...input.planner,
    ...identity,
    programmeProposalCategoryContext: input.categoryContext,
    programmeProposalFingerprint: fingerprint,
    pitchesUserCustomized: false,
    pendingProposalRefresh: null,
    mainPause: mainPause ? normalizeComposerMainPauseDraft(mainPause) : input.planner.mainPause,
    pitches: materializePitchesFromProposal(proposal),
    competitionFormat: "GROUP_MIX_ONLY",
    groupMixStrategy: "ROUND_ROBIN",
    groupCount: 1,
  };
}

export function reconcileComposerPlannerForParticipants(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  /** When true, never overwrite user-customised pitches (draft hydrate/resume). */
  preserveUserPitchEdits?: boolean;
}): TournamentComposerPlannerDraft {
  const proposal = resolveComposerProgrammeProposal({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  const identity = proposalTemplateIdentity(proposal);
  const nextFingerprint = buildFingerprintForProposal(
    proposal,
    input.participantCount,
    input.categoryContext,
  );

  const needsProposalMaterialisation = composerPitchDraftNeedsProposalMaterialisation({
    proposal,
    pitches: input.planner.pitches,
  });
  const staleGenericMarkedCustomised =
    input.planner.pitchesUserCustomized === true &&
    isGenericDefaultComposerPitchDraft(input.planner.pitches);
  const userCustomisedPitches =
    input.planner.pitchesUserCustomized === true && !staleGenericMarkedCustomised;

  if (proposal.kind === "NONE") {
    return {
      ...input.planner,
      programmeProposalCategoryContext: input.categoryContext,
      programmeProposalFingerprint: null,
      pendingProposalRefresh: null,
      programmeTemplateId: null,
      programmeTemplateVersion: null,
    };
  }

  const fingerprintChanged =
    input.planner.programmeProposalFingerprint != null &&
    input.planner.programmeProposalFingerprint !== nextFingerprint;

  if (userCustomisedPitches) {
    if (fingerprintChanged) {
      return {
        ...input.planner,
        programmeProposalCategoryContext: input.categoryContext,
        pendingProposalRefresh: {
          message:
            "Die Teams haben sich geändert. SCE hat eine neue Feldaufteilung vorbereitet.",
          nextFingerprint,
          nextTemplateId: identity.programmeTemplateId,
          nextTemplateVersion: identity.programmeTemplateVersion,
        },
      };
    }
    return {
      ...input.planner,
      programmeProposalCategoryContext: input.categoryContext,
      programmeProposalFingerprint: nextFingerprint,
      pendingProposalRefresh: null,
      ...identity,
    };
  }

  const templateChanged =
    input.planner.programmeTemplateId !== identity.programmeTemplateId ||
    input.planner.programmeTemplateVersion !== identity.programmeTemplateVersion;

  const mainPause =
    proposal.kind === "FULL_TEMPLATE" && proposal.template && !templateChanged
      ? input.planner.mainPause
        ? normalizeComposerMainPauseDraft(input.planner.mainPause)
        : defaultComposerMainPauseForTemplate(proposal.template)
      : proposal.kind === "FULL_TEMPLATE" && proposal.template
        ? defaultComposerMainPauseForTemplate(proposal.template)
        : input.planner.mainPause;

  const preservePitches = input.preserveUserPitchEdits === true && userCustomisedPitches;
  const pitches = preservePitches
    ? input.planner.pitches
    : needsProposalMaterialisation || staleGenericMarkedCustomised
      ? materializePitchesFromProposal(
          proposal,
          templateChanged || needsProposalMaterialisation ? undefined : input.planner.pitches,
        )
      : input.planner.pitches;

  return {
    ...input.planner,
    ...identity,
    programmeProposalCategoryContext: input.categoryContext,
    programmeProposalFingerprint: nextFingerprint,
    pendingProposalRefresh: null,
    competitionFormat: "GROUP_MIX_ONLY",
    groupMixStrategy: "ROUND_ROBIN",
    groupCount: 1,
    mainPause,
    pitches,
    pitchesUserCustomized: preservePitches ? true : false,
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
  categoryContext: ProgrammeTemplateCategoryContext | null;
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
  const resolved = resolveComposerProgrammeTemplate({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  const roundCount = resolved?.proposal.template?.rounds.length ?? 0;
  if (roundCount < 1) {
    const fieldProposalHeadline =
      resolved?.proposal.kind === "FIELD_PROPOSAL_ONLY"
        ? "SCE erstellt den Spielplan anhand deiner Feldaufteilung."
        : "Für diese Konstellation legst du Format und Felder fest — SCE erstellt den Spielplan danach.";
    return {
      status: "INCOMPLETE",
      requiredMinutes: null,
      availableMinutes,
      reserveMinutes: null,
      deficitMinutes: null,
      headline: fieldProposalHeadline,
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
