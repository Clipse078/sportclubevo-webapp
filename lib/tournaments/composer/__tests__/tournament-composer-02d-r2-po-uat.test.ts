import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTemplateScheduleAssignments } from "@/lib/tournament-scheduling/programme-templates/build-template-schedule-assignments";
import { E_FF12_ROTATION_4_TEMPLATE } from "@/lib/tournament-scheduling/programme-templates/catalogue/e-ff12-rotation";
import { computeRoundParallelScheduleTimeline } from "@/lib/tournament-scheduling/programme-templates/fixed-pause-round-scheduling";
import { hydrateTournamentComposerFormFromDraft } from "../hydrate-tournament-composer-form-from-draft";
import {
  addComposerPlayingUnitSubunit,
  splitComposerParticipantIntoDefaultSubunits,
} from "../tournament-composer-playing-units";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { validateComposerMainPauseWindow } from "../tournament-composer-main-pause";
import {
  countComposerCuratedTemplateParticipants,
  materializeComposerPitchesFromTemplate,
  reconcileComposerPlannerForParticipants,
  resolveComposerProgrammeTemplate,
} from "../tournament-composer-programme-template";
import { buildComposerScheduleFitView } from "../tournament-composer-schedule-fit";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-02D R2 PO UAT", () => {
  it("A — curated field materialisation for 4-team rotation", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(planner.programmeTemplateId).toBe(E_FF12_ROTATION_4_TEMPLATE.id);
    expect(planner.pitches).toHaveLength(3);
    expect(planner.pitches.map((p) => p.playersPerSide)).toEqual([3, 3, 6]);
    expect(planner.pitches.some((p) => p.label === "Feld 1" && p.templateFieldKey)).toBe(true);
    expect(planner.pitches).not.toEqual([
      expect.objectContaining({ label: "Feld 1", playersPerSide: null, templateFieldKey: undefined }),
    ]);
  });

  it("A — another curated participant count (6 teams)", () => {
    const resolved = resolveComposerProgrammeTemplate({ participantCount: 6, categoryContext: "E_FF12" });
    expect(resolved?.proposal.template?.fields.length).toBeGreaterThan(0);
    const pitches = materializeComposerPitchesFromTemplate(resolved!.proposal.template!);
    expect(pitches.length).toBe(resolved!.proposal.template!.fields.length);
    expect(pitches.every((p) => p.playersPerSide != null)).toBe(true);
  });

  it("B — unsupported count keeps manual fallback", () => {
    const reconciled = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 17,
      categoryContext: "E_FF12",
    });
    expect(reconciled.programmeTemplateId).toBeNull();
    expect(reconciled.pitches).toHaveLength(1);
  });

  it("C — playing units do not change curated template participant count", () => {
    const participants = [
      {
        localId: "p1",
        kind: "MANUAL" as const,
        manualLabel: "T1",
        displayName: "T1",
        subLabel: null,
        dressingRooms: [],
        playingUnits: splitComposerParticipantIntoDefaultSubunits({
          participantLocalId: "p1",
          baseDisplayName: "T1",
          nextLocalId: () => "u1",
        }),
      },
      ...Array.from({ length: 3 }, (_, i) => ({
        localId: `p${i + 2}`,
        kind: "MANUAL" as const,
        manualLabel: `T${i + 2}`,
        displayName: `T${i + 2}`,
        subLabel: null,
        dressingRooms: [],
      })),
    ];
    expect(countComposerCuratedTemplateParticipants(participants)).toBe(4);
    const withExtraUnit = [
      {
        ...participants[0]!,
        playingUnits: addComposerPlayingUnitSubunit({
          units: participants[0]!.playingUnits ?? [],
          baseDisplayName: "T1",
          nextLocalId: () => "u9",
        }),
      },
      ...participants.slice(1),
    ];
    expect(countComposerCuratedTemplateParticipants(withExtraUnit)).toBe(4);
    expect(
      resolveComposerProgrammeTemplate({ participantCount: 4, categoryContext: "E_FF12" })?.proposal.template?.id,
    ).toBe(E_FF12_ROTATION_4_TEMPLATE.id);
  });

  it("D — pause window validation against termin", () => {
    const base = {
      enabled: true,
      durationMinutes: 10,
      startLocalTime: "11:00",
    };
    expect(
      validateComposerMainPauseWindow({
        mainPause: base,
        tournamentStartAt: "2026-06-01T10:00",
        tournamentEndAt: "2026-06-01T12:00",
      }),
    ).toBeNull();
    expect(
      validateComposerMainPauseWindow({
        mainPause: { ...base, startLocalTime: "09:55" },
        tournamentStartAt: "2026-06-01T10:00",
        tournamentEndAt: "2026-06-01T12:00",
      }),
    ).toMatch(/vor Turnierbeginn/i);
    expect(
      validateComposerMainPauseWindow({
        mainPause: { ...base, startLocalTime: "12:00" },
        tournamentStartAt: "2026-06-01T10:00",
        tournamentEndAt: "2026-06-01T12:00",
      }),
    ).toMatch(/nach Turnierende/i);
    expect(
      validateComposerMainPauseWindow({
        mainPause: { ...base, startLocalTime: "11:55" },
        tournamentStartAt: "2026-06-01T10:00",
        tournamentEndAt: "2026-06-01T12:00",
      }),
    ).toMatch(/endet nach Turnierende/i);
  });

  it("E — fixed pause scheduling avoids fixture overlap and round splits", () => {
    const tournamentStartUtcMs = new Date("2026-06-01T10:00:00").getTime();
    const pause = {
      startUtcMs: new Date("2026-06-01T11:00:00").getTime(),
      endUtcMs: new Date("2026-06-01T11:10:00").getTime(),
    };
    const timeline = computeRoundParallelScheduleTimeline({
      tournamentStartUtcMs,
      roundCount: 6,
      matchDurationMinutes: 12,
      transitionMinutes: 3,
      fixedPause: pause,
    });
    expect(timeline.roundStartUtcMs).toEqual([
      new Date("2026-06-01T10:00:00").getTime(),
      new Date("2026-06-01T10:15:00").getTime(),
      new Date("2026-06-01T10:30:00").getTime(),
      new Date("2026-06-01T10:45:00").getTime(),
      new Date("2026-06-01T11:10:00").getTime(),
      new Date("2026-06-01T11:25:00").getTime(),
    ]);
    const matchMs = 12 * 60_000;
    for (const start of timeline.roundStartUtcMs) {
      const end = start + matchMs;
      expect(start >= pause.endUtcMs || end <= pause.startUtcMs).toBe(true);
    }
  });

  it("F — fit calculation PASS, exact fit, FAIL with reserve/deficit", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    planner.timing.matchDurationMinutes = 12;
    planner.timing.transitionMinutes = 3;
    planner.mainPause = { enabled: true, durationMinutes: 10, startLocalTime: "11:00" };

    const pass = buildComposerScheduleFitView({
      participantCount: 4,
      categoryContext: "E_FF12",
      startAt: "2026-06-01T10:00",
      endAt: "2026-06-01T12:00",
      planner,
    });
    expect(pass.status).toBe("PASS");
    expect(pass.requiredMinutes).toBe(97);
    expect(pass.reserveMinutes).toBe(23);

    const exact = buildComposerScheduleFitView({
      participantCount: 4,
      categoryContext: "E_FF12",
      startAt: "2026-06-01T10:00",
      endAt: "2026-06-01T11:37",
      planner,
    });
    expect(exact.status).toBe("PASS");
    expect(exact.reserveMinutes).toBe(0);

    const fail = buildComposerScheduleFitView({
      participantCount: 4,
      categoryContext: "E_FF12",
      startAt: "2026-06-01T10:00",
      endAt: "2026-06-01T11:30",
      planner,
    });
    expect(fail.status).toBe("FAIL");
    expect(fail.deficitMinutes).toBe(7);
  });

  it("G — tournament window must not seed Spieldauer in creator bootstrap", () => {
    const formSource = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(formSource).not.toMatch(/defaultMatchDurationMinutes:\s*defaultTournamentDurationMinutes/);
    const planner = createDefaultTournamentComposerPlannerDraft();
    expect(planner.timing.matchDurationMinutes).toBe(12);
    expect(planner.timing.matchDurationMinutes).not.toBe(120);
  });

  it("H — Spielplan panel uses pause-first UX and proposal refresh affordance", () => {
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).toMatch(/tournament-composer-proposal-refresh-accept/);
    expect(panels).toMatch(/tournament-composer-main-pause-start/);
    expect(panels).not.toMatch(/main-pause-after-round/);
  });

  it("hydrate reconciles stale single-pitch drafts for curated counts", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.participants = Array.from({ length: 4 }, (_, i) => ({
      localId: `p${i}`,
      kind: "TEAM",
      teamId: "team-e1",
      manualLabel: `T${i + 1}`,
      displayName: `T${i + 1}`,
      subLabel: null,
      dressingRooms: [],
    }));
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    const hydrated = hydrateTournamentComposerFormFromDraft(draft, {
      teamOptions: [{ id: "team-e1", name: "E1", ageGroup: "E", genderGroup: null }],
    });
    expect(hydrated.planner!.pitches).toHaveLength(3);
    expect(hydrated.planner!.programmeTemplateId).toBe(E_FF12_ROTATION_4_TEMPLATE.id);
  });

  it("buildTemplateScheduleAssignments respects fixed pause block", () => {
    const tournamentStartUtcMs = new Date("2026-06-01T10:00:00").getTime();
    const fixtures = E_FF12_ROTATION_4_TEMPLATE.rounds.flatMap((round) =>
      round.assignments.map((assignment, slotIndexInRound) => ({
        templateId: E_FF12_ROTATION_4_TEMPLATE.id,
        templateVersion: 1,
        slotMapping: {} as never,
        roundIndex: round.roundNumber - 1,
        slotIndexInRound,
        fieldKey: assignment.fieldKey,
        fieldDisplayOrder: 1,
        playersPerSide: 3,
        home: { participantId: "a", slot: "A" as const, subunitIndex: null },
        away: { participantId: "b", slot: "B" as const, subunitIndex: null },
        generatorKey: "k",
        fixtureId: `f-${round.roundNumber}-${slotIndexInRound}`,
        tournamentPitchId: `pitch-${assignment.fieldKey}`,
      })),
    );
    const assignments = buildTemplateScheduleAssignments({
      tournamentStartUtcMs,
      matchDurationMinutes: 12,
      transitionMinutes: 3,
      fixedPause: {
        startUtcMs: new Date("2026-06-01T11:00:00").getTime(),
        endUtcMs: new Date("2026-06-01T11:10:00").getTime(),
      },
      fixtures,
    });
    const pauseStart = new Date("2026-06-01T11:00:00").getTime();
    const pauseEnd = new Date("2026-06-01T11:10:00").getTime();
    for (const row of assignments) {
      expect(row.startUtcMs >= pauseEnd || row.resourceEndUtcMs <= pauseStart).toBe(true);
    }
  });
});
