/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { validateHomePlannerDraft } from "../tournament-composer-planner-validation";
import { buildTournamentSchedulePreview } from "../tournament-composer-schedule-preview";
import {
  createComposerScheduleRoundBreakDraft,
  validateComposerScheduleRoundBreaks,
} from "../tournament-composer-schedule-round-breaks";
import {
  reconcileComposerPlannerForParticipants,
  restoreComposerProgrammeProposal,
} from "../tournament-composer-programme-template";
import { resolveComposerSpielplanCreationEnabled } from "../resolve-composer-spielplan-creation-enabled";
import { prepareTournamentComposerProposal } from "../prepare-tournament-composer-proposal";
import { resolveAuthoritativeTeamJuniorCategoryCode } from "@/lib/teams/jahrgang-rules";
import { resolveProgrammeCategoryFromComposerParticipants } from "@/lib/tournament-scheduling/programme-templates/programme-template-category";
import ComposerSchedulePreviewPresentation from "@/components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation";
import { E_FF12_ROTATION_4_TEMPLATE } from "@/lib/tournament-scheduling/programme-templates/catalogue/e-ff12-rotation";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function e4DraftWithBreaks(
  breaks: { afterRoundNumber: number; durationMinutes: number; localId?: string }[],
) {
  const planner = reconcileComposerPlannerForParticipants({
    planner: createDefaultTournamentComposerPlannerDraft(),
    participantCount: 4,
    categoryContext: "E_FF12",
  });
  planner.timing.matchDurationMinutes = 10;
  planner.timing.transitionMinutes = 5;
  planner.scheduleRoundBreaks =
    breaks.length === 0
      ? []
      : breaks.map((b) =>
          createComposerScheduleRoundBreakDraft({
            localId: b.localId ?? `b-${b.afterRoundNumber}`,
            afterRoundNumber: b.afterRoundNumber,
            durationMinutes: b.durationMinutes,
          }),
        );
  planner.mainPause = undefined;

  const draft = createEmptyTournamentComposerDraft();
  draft.homeAway = "HOME";
  draft.spielplanCreationEnabled = true;
  draft.startAt = "2026-06-01T10:00";
  draft.endAt = "2026-06-01T13:00";
  draft.participants = Array.from({ length: 4 }, (_, i) => ({
    localId: `p${i}`,
    kind: "TEAM" as const,
    teamId: "team-e1",
    displayName: `Team ${i + 1}`,
    subLabel: null,
    dressingRooms: [],
  }));
  draft.planner = planner;
  return { draft, planner };
}

describe("SCE-TOURNAMENT-PLANNER-02D R11 — multi round breaks", () => {
  it("CASE A — 0 pauses yields valid schedule", () => {
    const { draft } = e4DraftWithBreaks([]);
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: "E_FF12",
    });
    expect(preview.status).toBe("OK");
    expect(preview.timelineItems.every((i) => i.kind !== "BREAK")).toBe(true);
    expect(validateHomePlannerDraft(draft)).toEqual({});
  });

  it("CASE B — 1 pause after R3 appears between R3 and R4 with derived times", () => {
    const { draft } = e4DraftWithBreaks([{ afterRoundNumber: 3, durationMinutes: 10 }]);
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: "E_FF12",
    });
    expect(preview.status).toBe("OK");
    const kinds = preview.timelineItems.map((item) =>
      item.kind === "ROUND" ? `R${item.roundNumber}` : "BREAK",
    );
    const breakIndex = kinds.indexOf("BREAK");
    expect(kinds.slice(breakIndex - 1, breakIndex + 2)).toEqual(["R3", "BREAK", "R4"]);
    const br = preview.timelineItems.find((i) => i.kind === "BREAK");
    expect(br?.kind).toBe("BREAK");
    if (br?.kind === "BREAK") {
      expect(br.timeRangeLabel).toBe("10:45–10:55");
      expect(br.durationMinutes).toBe(10);
    }
  });

  it("CASE C — two pauses at correct chronological boundaries", () => {
    const { draft } = e4DraftWithBreaks([
      { afterRoundNumber: 2, durationMinutes: 10, localId: "b2" },
      { afterRoundNumber: 5, durationMinutes: 15, localId: "b5" },
    ]);
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: "E_FF12",
    });
    expect(preview.status).toBe("OK");
    const breaks = preview.timelineItems.filter((i) => i.kind === "BREAK");
    expect(breaks).toHaveLength(2);
    const kinds = preview.timelineItems.map((i) =>
      i.kind === "ROUND" ? `R${i.roundNumber}` : "BREAK",
    );
    expect(kinds).toEqual(["R1", "R2", "BREAK", "R3", "R4", "R5", "BREAK", "R6"]);
    const r6 = preview.timelineItems.find((i) => i.kind === "ROUND" && i.roundNumber === 6);
    expect(r6?.kind).toBe("ROUND");
    if (r6?.kind === "ROUND") {
      expect(r6.roundStartLabel).toBe("11:40");
    }
  });

  it("CASE D — duplicate pause after same round rejected", () => {
    const errors = validateComposerScheduleRoundBreaks({
      roundCount: 6,
      breaks: [
        createComposerScheduleRoundBreakDraft({ localId: "a", afterRoundNumber: 3, durationMinutes: 10 }),
        createComposerScheduleRoundBreakDraft({ localId: "b", afterRoundNumber: 3, durationMinutes: 15 }),
      ],
    });
    expect(Object.values(errors)[0]).toMatch(/höchstens eine Pause/i);
  });

  it("CASE E — reduced round count invalidates break without silent move", () => {
    const br = createComposerScheduleRoundBreakDraft({
      localId: "x",
      afterRoundNumber: 5,
      durationMinutes: 10,
    });
    const errors = validateComposerScheduleRoundBreaks({ roundCount: 4, breaks: [br] });
    expect(Object.values(errors)[0]).toMatch(/zwischen 1 und 3/i);
  });

  it("CASE F — template break instantiates canonical model", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(planner.scheduleRoundBreaks?.[0]?.afterRoundNumber).toBe(
      E_FF12_ROTATION_4_TEMPLATE.breakHints[0]!.afterRoundNumber,
    );
    expect(planner.mainPause).toBeUndefined();
  });

  it("CASE G — user-added break after template uses same scheduleRoundBreaks array", () => {
    const { draft, planner } = e4DraftWithBreaks([
      { afterRoundNumber: 3, durationMinutes: 10, localId: "template" },
    ]);
    draft.planner = {
      ...planner,
      scheduleRoundBreaks: [
        ...(planner.scheduleRoundBreaks ?? []),
        createComposerScheduleRoundBreakDraft({ afterRoundNumber: 5, durationMinutes: 5 }),
      ],
    };
    expect(draft.planner!.scheduleRoundBreaks).toHaveLength(2);
    expect(draft.planner!.mainPause).toBeUndefined();
  });

  it("CASE H — Spielplan OFF requires no pauses", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.spielplanCreationEnabled = false;
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    expect(resolveComposerSpielplanCreationEnabled(draft)).toBe(false);
    expect(validateHomePlannerDraft(draft)).toEqual({});
  });

  it("CASE I — unspecified playing format remains valid on generic path", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.spielplanCreationEnabled = true;
    draft.startAt = "2026-06-01T10:00";
    draft.endAt = "2026-06-01T18:00";
    draft.participants = Array.from({ length: 4 }, (_, i) => ({
      localId: `p${i}`,
      kind: "MANUAL" as const,
      manualLabel: `T${i + 1}`,
      displayName: `T${i + 1}`,
      subLabel: null,
      dressingRooms: [],
    }));
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    draft.planner.pitches = [{ localId: "p1", label: "Feld 1", playersPerSide: null }];
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: null,
    });
    expect(preview.status).toBe("OK");
  });

  it("CASE J — R8 FCA category preconfiguration regression", () => {
    const juniorCode = resolveAuthoritativeTeamJuniorCategoryCode({
      ageGroup: null,
      shortName: "Junioren E1",
      alternativeName: "E1",
    });
    const { categoryContext } = resolveProgrammeCategoryFromComposerParticipants({
      participants: [{ kind: "TEAM", teamId: "fca-e1", teamJuniorCategoryCode: juniorCode }],
      teamAgeGroupById: new Map(),
    });
    expect(categoryContext).toBe("E_FF12");
    const prepared = prepareTournamentComposerProposal({
      participants: Array.from({ length: 4 }, (_, i) => ({
        localId: `p${i}`,
        kind: "TEAM" as const,
        teamId: "fca-e1",
        teamJuniorCategoryCode: juniorCode,
        displayName: `T${i + 1}`,
        subLabel: null,
        dressingRooms: [],
      })),
      planner: createDefaultTournamentComposerPlannerDraft(),
    });
    expect(prepared.proposal.kind).toBe("FULL_TEMPLATE");
  });

  it("CASE K — R9 chronological preview regression", () => {
    const { draft } = e4DraftWithBreaks([{ afterRoundNumber: 4, durationMinutes: 10 }]);
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: "E_FF12",
    });
    expect(preview.status).toBe("OK");
    render(
      <ComposerSchedulePreviewPresentation
        payload={draft}
        timelineItems={preview.timelineItems}
        summaryLine="10:00 Start"
      />,
    );
    expect(screen.getAllByTestId("tournament-composer-schedule-break").length).toBe(1);
    const kinds = preview.timelineItems.map((item) =>
      item.kind === "ROUND" ? `R${item.roundNumber}` : "BREAK",
    );
    expect(kinds.slice(0, 6)).toEqual(["R1", "R2", "R3", "R4", "BREAK", "R5"]);
  });

  it("CASE L — optional Spielplan step counts unchanged", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toMatch(/spielplanCreationEnabled/);
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).toMatch(/Pause hinzufügen/);
    expect(panels).not.toMatch(/Grössere Turnierpause/);
    expect(panels).not.toMatch(/Pausenbeginn/);
  });

  it("reconcile preserves user-edited breaks when template unchanged", () => {
    const base = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    base.scheduleRoundBreaks = [
      createComposerScheduleRoundBreakDraft({ afterRoundNumber: 2, durationMinutes: 20 }),
    ];
    const again = reconcileComposerPlannerForParticipants({
      planner: base,
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(again.scheduleRoundBreaks?.[0]?.afterRoundNumber).toBe(2);
    expect(again.scheduleRoundBreaks?.[0]?.durationMinutes).toBe(20);
  });

  it("accepting proposal refresh resets breaks to template defaults", () => {
    const base = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    base.scheduleRoundBreaks = [
      createComposerScheduleRoundBreakDraft({ afterRoundNumber: 2, durationMinutes: 20 }),
    ];
    const restored = restoreComposerProgrammeProposal({
      planner: base,
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(restored.scheduleRoundBreaks?.[0]?.afterRoundNumber).toBe(3);
  });
});
