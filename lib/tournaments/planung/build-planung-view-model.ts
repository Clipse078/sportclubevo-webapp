/**
 * Pure builder: domain snapshot → TournamentPlanungViewModel.
 */

import type { TournamentTimingAssessment } from "@/lib/tournament-scheduling/smart-timing";
import type { TournamentFeasibilityResult } from "@/lib/tournament-scheduling/feasibility";
import type {
  TournamentPartialRegenerationResult,
  TournamentScheduleOptimisationResult,
} from "@/lib/tournament-scheduling/schedule-optimiser/types";
import type { TournamentPlannerOwnershipResolution } from "@/lib/tournament-scheduling/planner-eligibility";
import {
  buildRegenerationSummaryMessage,
  feasibilityUxHeadline,
  resolveFeasibilityUxStatus,
  scheduleLockDimensionLabel,
} from "./planung-presentation";
import { buildPlanungTimeScale, resolveTimeRowIndex } from "./time-scale";
import {
  formatGroupRankPlaceholder,
  formatWinnerOfFixtureLabel,
} from "./qualification-display";
import type {
  TournamentPlanungAvailability,
  TournamentPlanungBoardCell,
  TournamentPlanungDiagnostic,
  TournamentPlanungFixtureBlock,
  TournamentPlanungIncompleteItem,
  TournamentPlanungParticipantIdentity,
  TournamentPlanungSmartTimingSummary,
  TournamentPlanungViewModel,
} from "./types";

export type PlanungDomainSnapshot = {
  tournamentId: string;
  ownership: TournamentPlannerOwnershipResolution;
  timezone: string;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  scheduleVersionId: string | null;
  scheduleRevision: number | null;
  schedulingConfig: {
    matchDurationMinutes: number;
    transitionMinutes: number;
    minRestMinutes: number;
  };
  pitches: readonly { id: string; displayOrder: number; label: string }[];
  breaks: readonly {
    id: string;
    label: string | null;
    startAt: string;
    endAt: string;
    scope: "ALL_PITCHES" | "SELECTED_PITCHES";
    tournamentPitchIds: readonly string[];
  }[];
  fixtures: readonly {
    id: string;
    stageKey: string;
    roundIndex: number;
    slotIndexInRound: number;
    tournamentGroupId: string | null;
    sideAParticipantId: string | null;
    sideBParticipantId: string | null;
    sides: readonly {
      side: "A" | "B";
      sourceType: "CONCRETE_PARTICIPANT" | "QUALIFICATION_REFERENCE";
      participantId: string | null;
      qualification: {
        sourceType: "GROUP_RANK" | "WINNER_OF_FIXTURE" | "LOSER_OF_FIXTURE";
        rank: number | null;
        sourceGroupLabel: string | null;
        sourceFixture: { roundIndex: number; slotIndexInRound: number } | null;
      } | null;
    }[];
    phaseLabel: string | null;
    groupLabel: string | null;
  }[];
  assignments: readonly {
    id: string;
    fixtureId: string;
    tournamentPitchId: string;
    startAt: string;
    endAt: string;
    scheduleLockDimension: "TIME" | "PITCH" | "TIME_AND_PITCH" | null;
  }[];
  participants: readonly TournamentPlanungParticipantIdentity[];
  participantCount: number;
  fixtureCount: number;
  feasibility: TournamentFeasibilityResult | null;
  smartTiming: TournamentTimingAssessment | null;
  optimisation: TournamentScheduleOptimisationResult | TournamentPartialRegenerationResult | null;
  regenerationMetrics?: TournamentScheduleOptimisationResult["changeMetrics"];
};

function resolveAvailability(
  ownership: TournamentPlannerOwnershipResolution,
): TournamentPlanungAvailability {
  if (ownership === "TENANT_ORGANISED") return "AVAILABLE";
  if (ownership === "EXTERNALLY_ORGANISED") return "UNAVAILABLE_EXTERNALLY_ORGANISED";
  return "UNAVAILABLE_UNKNOWN_OWNERSHIP";
}

function participantById(
  participants: readonly TournamentPlanungParticipantIdentity[],
  id: string | null,
): TournamentPlanungParticipantIdentity | null {
  if (!id) return null;
  return participants.find((p) => p.participantId === id) ?? null;
}

function sidePresentation(
  snapshot: PlanungDomainSnapshot,
  fixture: PlanungDomainSnapshot["fixtures"][number],
  side: "A" | "B",
): { label: string; crestUrl: string | null; isPlaceholder: boolean } {
  const participantId = side === "A" ? fixture.sideAParticipantId : fixture.sideBParticipantId;
  const concrete = participantById(snapshot.participants, participantId);
  if (concrete) {
    return {
      label: concrete.displayName,
      crestUrl: concrete.crestUrl,
      isPlaceholder: false,
    };
  }

  const sideRow = fixture.sides.find((s) => s.side === side);
  if (sideRow?.sourceType === "CONCRETE_PARTICIPANT" && sideRow.participantId) {
    const p = participantById(snapshot.participants, sideRow.participantId);
    if (p) {
      return { label: p.displayName, crestUrl: p.crestUrl, isPlaceholder: false };
    }
  }

  const qual = sideRow?.qualification;
  if (qual?.sourceType === "GROUP_RANK" && qual.rank != null && qual.sourceGroupLabel) {
    return {
      label: formatGroupRankPlaceholder(qual.rank, qual.sourceGroupLabel),
      crestUrl: null,
      isPlaceholder: true,
    };
  }
  if (qual?.sourceType === "WINNER_OF_FIXTURE" && qual.sourceFixture) {
    return {
      label: formatWinnerOfFixtureLabel(qual.sourceFixture),
      crestUrl: null,
      isPlaceholder: true,
    };
  }

  return { label: "Offen", crestUrl: null, isPlaceholder: true };
}

function buildFixtureBlock(
  snapshot: PlanungDomainSnapshot,
  fixture: PlanungDomainSnapshot["fixtures"][number],
  assignment: PlanungDomainSnapshot["assignments"][number] | null,
  pitchLabel: string,
): TournamentPlanungFixtureBlock {
  const sideA = sidePresentation(snapshot, fixture, "A");
  const sideB = sidePresentation(snapshot, fixture, "B");
  const lockDimension = assignment?.scheduleLockDimension ?? null;
  const lockSuffix = lockDimension ? `, ${scheduleLockDimensionLabel(lockDimension)}` : "";
  const timeLine =
    assignment != null
      ? new Date(assignment.startAt).toLocaleTimeString("de-CH", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: snapshot.timezone,
        })
      : "ungeplant";

  return {
    kind: "FIXTURE",
    fixtureId: fixture.id,
    assignmentId: assignment?.id ?? null,
    sideA,
    sideB,
    startUtc: assignment?.startAt ?? snapshot.windowStartUtc ?? new Date(0).toISOString(),
    endUtc: assignment?.endAt ?? snapshot.windowStartUtc ?? new Date(0).toISOString(),
    pitchId: assignment?.tournamentPitchId ?? snapshot.pitches[0]?.id ?? "",
    phaseLabel: fixture.phaseLabel,
    groupLabel: fixture.groupLabel,
    lockDimension,
    accessibleLabel: `${sideA.label} gegen ${sideB.label}, ${timeLine}, ${pitchLabel}${lockSuffix}`,
  };
}

function buildIncompleteSetup(snapshot: PlanungDomainSnapshot): TournamentPlanungIncompleteItem[] {
  const items: TournamentPlanungIncompleteItem[] = [];
  if (!snapshot.windowStartUtc || !snapshot.windowEndUtc) {
    items.push({
      code: "WINDOW",
      label: "Zeitfenster fehlt",
      href: null,
    });
  }
  if (snapshot.participantCount < 2) {
    items.push({ code: "PARTICIPANTS", label: "Teilnehmer fehlen", href: null });
  }
  if (snapshot.pitches.length < 1) {
    items.push({
      code: "PITCHES",
      label: "Turnierfelder fehlen",
      href: "/dashboard/tournamentcenter",
    });
  }
  const legacyPlannerIncomplete =
    snapshot.pitches.length < 1 || snapshot.fixtureCount < 1;
  if (legacyPlannerIncomplete) {
    items.push({
      code: "PLANNER_SETUP",
      label: "Turnierplanung einrichten — Format, Felder, Timing und Pausen vervollständigen",
      href: `/dashboard/tournamentcenter/${snapshot.tournamentId}/edit?tab=uebersicht`,
    });
  } else if (snapshot.fixtureCount < 1) {
    items.push({
      code: "FIXTURES",
      label: "Spiele wurden noch nicht erzeugt",
      href: null,
    });
  }
  return items;
}

function buildSmartTimingSummary(
  assessment: TournamentTimingAssessment | null,
  timezone: string,
): TournamentPlanungSmartTimingSummary | null {
  if (!assessment) return null;
  const detailLines: string[] = [];
  if (assessment.predictedFinishUtcMs != null) {
    const end = new Date(assessment.predictedFinishUtcMs).toLocaleTimeString("de-CH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
    detailLines.push(`Voraussichtliches Ende: ${end}`);
  }
  if (assessment.reserveMinutes != null) {
    detailLines.push(`Reserve: ${assessment.reserveMinutes} Min.`);
  }
  if (assessment.pitchCountRecommendation?.rationale) {
    detailLines.push(assessment.pitchCountRecommendation.rationale);
  }

  let headline = "Turnierplan passt in das Zeitfenster.";
  if (assessment.feasibilityStatus === "TIGHT") {
    headline = "Zeitfenster knapp.";
  }
  if (assessment.feasibilityStatus === "INFEASIBLE") {
    headline = "Zeitfenster reicht nicht aus.";
  }

  return {
    headline,
    detailLines,
    predictedEndUtc:
      assessment.predictedFinishUtcMs != null
        ? new Date(assessment.predictedFinishUtcMs).toISOString()
        : null,
    reserveMinutes: assessment.reserveMinutes ?? null,
  };
}

function mapDiagnostics(
  feasibility: TournamentFeasibilityResult | null,
  optimisation: TournamentScheduleOptimisationResult | null,
): TournamentPlanungDiagnostic[] {
  const out: TournamentPlanungDiagnostic[] = [];
  const lockDiagnostics: TournamentPartialRegenerationResult["lockConflictDiagnostics"] =
    optimisation && "lockConflictDiagnostics" in optimisation
      ? (optimisation as TournamentPartialRegenerationResult).lockConflictDiagnostics
      : [];
  if (lockDiagnostics.length) {
    for (const diag of lockDiagnostics) {
      out.push({
        id: `lock-${diag.fixtureIds.join("-")}-${diag.category}`,
        message: diag.message,
        severity: "danger",
      });
    }
  }
  if (feasibility?.diagnostics?.length) {
    for (const diag of feasibility.diagnostics.slice(0, 6)) {
      out.push({
        id: diag.code,
        message: diag.code.replace(/\./g, " ").replace(/_/g, " "),
        severity: feasibility.status === "INFEASIBLE" ? "danger" : "warning",
      });
    }
  }
  return out;
}

export function buildTournamentPlanungViewModel(
  snapshot: PlanungDomainSnapshot,
): TournamentPlanungViewModel {
  const availability = resolveAvailability(snapshot.ownership);
  const incompleteSetup = buildIncompleteSetup(snapshot);
  const hasAssignments = snapshot.assignments.length > 0;
  const schedulePresence =
    snapshot.assignments.length === 0
      ? "NONE"
      : snapshot.assignments.length >= snapshot.fixtureCount
        ? "COMPLETE"
        : "PARTIAL";

  const feasibilityUxStatus = resolveFeasibilityUxStatus({
    feasibility: snapshot.feasibility?.status ?? null,
    optimisation: snapshot.optimisation?.status ?? null,
    hasAssignments,
  });

  const pitchById = new Map(snapshot.pitches.map((p) => [p.id, p]));

  const cells: TournamentPlanungBoardCell[] = [];

  for (const fixture of snapshot.fixtures) {
    const assignment =
      snapshot.assignments.find((a) => a.fixtureId === fixture.id) ?? null;
    const pitch = assignment ? pitchById.get(assignment.tournamentPitchId) : null;
    cells.push(
      buildFixtureBlock(snapshot, fixture, assignment, pitch?.label ?? "Feld"),
    );
  }

  for (const br of snapshot.breaks) {
    const label = br.label?.trim() || "Pause";
    cells.push({
      kind: "BREAK",
      breakId: br.id,
      label,
      startUtc: br.startAt,
      endUtc: br.endAt,
      pitchIds: br.scope === "ALL_PITCHES" ? snapshot.pitches.map((p) => p.id) : [...br.tournamentPitchIds],
      scope: br.scope,
      accessibleLabel: `${label}, ${new Date(br.startAt).toLocaleTimeString("de-CH", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: snapshot.timezone,
      })}`,
    });
  }

  const mobileTimeline = [...cells].sort(
    (a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc),
  );

  const timeScale =
    snapshot.windowStartUtc && snapshot.windowEndUtc
      ? buildPlanungTimeScale({
          windowStartUtc: snapshot.windowStartUtc,
          windowEndUtc: snapshot.windowEndUtc,
          matchDurationMinutes: snapshot.schedulingConfig.matchDurationMinutes,
          transitionMinutes: snapshot.schedulingConfig.transitionMinutes,
          assignmentStartUtc: snapshot.assignments.map((a) => a.startAt),
          breakStartUtc: snapshot.breaks.map((b) => b.startAt),
        })
      : null;

  const diagnostics = mapDiagnostics(snapshot.feasibility, snapshot.optimisation);
  if (feasibilityUxStatus) {
    diagnostics.unshift({
      id: "feasibility-ux",
      message: feasibilityUxHeadline(feasibilityUxStatus),
      severity:
        feasibilityUxStatus === "CONFLICT"
          ? "danger"
          : feasibilityUxStatus === "WINDOW_TIGHT"
            ? "warning"
            : "info",
    });
  }

  return {
    tournamentId: snapshot.tournamentId,
    availability,
    ownership: snapshot.ownership,
    scheduleVersionId: snapshot.scheduleVersionId,
    scheduleRevision: snapshot.scheduleRevision,
    schedulePresence,
    optimisationStatus: snapshot.optimisation?.status ?? null,
    feasibilityStatus: snapshot.feasibility?.status ?? null,
    feasibilityUxStatus,
    pitches: snapshot.pitches.map((p) => ({
      pitchId: p.id,
      displayOrder: p.displayOrder,
      label: p.label,
    })),
    timeScale,
    cells,
    mobileTimeline,
    smartTiming: buildSmartTimingSummary(snapshot.smartTiming, snapshot.timezone),
    diagnostics,
    regenerationSummary: buildRegenerationSummaryMessage(snapshot.regenerationMetrics),
    incompleteSetup,
    actions: {
      canGenerate:
        availability === "AVAILABLE" &&
        incompleteSetup.length === 0 &&
        schedulePresence === "NONE",
      canRegenerate:
        availability === "AVAILABLE" &&
        schedulePresence !== "NONE" &&
        incompleteSetup.length === 0,
      generateLabel: "✨ Spielplan automatisch erstellen",
      regenerateLabel: "Spielplan neu berechnen",
      regenerateHint: "Gesperrte Zeiten und Felder bleiben erhalten.",
    },
  };
}

export { resolveTimeRowIndex };
