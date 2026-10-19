import {
  computeProgrammeRequiredMinutesFromTimeline,
  computeRoundParallelScheduleTimeline,
} from "@/lib/tournament-scheduling/programme-templates/fixed-pause-round-scheduling";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";
import { validateComposerMainPauseWindow, resolveComposerMainPauseUtcWindow } from "./tournament-composer-main-pause";
import { buildTournamentSchedulePreview } from "./tournament-composer-schedule-preview";
import { resolveComposerProgrammeTemplate } from "./tournament-composer-programme-template";

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
  payload?: TournamentComposerDraftPayload;
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

  if (input.payload) {
    const preview = buildTournamentSchedulePreview({
      payload: input.payload,
      categoryContext: input.categoryContext,
      planner: input.planner,
    });
    if (preview.status !== "OK") {
      return {
        status: "INCOMPLETE",
        requiredMinutes: null,
        availableMinutes,
        reserveMinutes: null,
        deficitMinutes: null,
        headline: preview.fitHeadline,
        detail: preview.fitDetail,
        requiredEndLabel: preview.programmeEndLabel,
        tournamentEndLabel: formatClockFromUtcMs(end.getTime()),
      };
    }
    const requiredMinutes =
      preview.programmeEndUtcMs != null
        ? Math.round((preview.programmeEndUtcMs - start.getTime()) / 60_000)
        : null;
    return {
      status: preview.fitStatus === "PASS" ? "PASS" : "FAIL",
      requiredMinutes,
      availableMinutes,
      reserveMinutes: preview.reserveMinutes,
      deficitMinutes: preview.deficitMinutes,
      headline: preview.fitHeadline,
      detail: preview.fitDetail,
      requiredEndLabel: preview.programmeEndLabel,
      tournamentEndLabel: formatClockFromUtcMs(end.getTime()),
    };
  }

  const resolved = resolveComposerProgrammeTemplate({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  const roundCount = resolved?.proposal.template?.rounds.length ?? 0;
  if (roundCount < 1) {
    return {
      status: "INCOMPLETE",
      requiredMinutes: null,
      availableMinutes,
      reserveMinutes: null,
      deficitMinutes: null,
      headline: "Konfiguriere Felder und Zeiten — SCE zeigt den Spielplan in der Vorschau.",
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
