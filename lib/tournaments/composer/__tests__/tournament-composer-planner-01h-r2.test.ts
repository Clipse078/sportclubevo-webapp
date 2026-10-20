import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import {
  applyComposerRecommendedTiming,
  assessTournamentComposerSmartTiming,
  buildTournamentComposerSmartTimingView,
  composerSmartTimingFeasibilitySurface,
  composerSmartTimingMissingInputHint,
} from "../tournament-composer-smart-timing";
import { validateHomePlannerDraft } from "../tournament-composer-planner-validation";
import {
  combineTournamentStartDateWithLocalTime,
  createDefaultComposerBreakDraft,
  normalizeComposerBreakDraft,
  resolveComposerBreakDateTimes,
} from "../tournament-composer-planner-breaks";
import { hydrateTournamentComposerFormFromDraft } from "../hydrate-tournament-composer-form-from-draft";
import { buildTournamentCreateTabNavigationConfig } from "@/lib/tournaments/tournament-create-workflow-config";
import { persistTournamentPlannerFromComposer } from "../persist-tournament-planner-from-composer";
import { vi } from "vitest";

vi.mock("@/lib/tournament-scheduling/competition-structure/competition-structure-service", () => ({
  upsertTournamentCompetitionConfiguration: vi.fn(),
  listTournamentPhases: vi.fn().mockResolvedValue([{ id: "phase-g", phaseType: "GROUP_MIX", stageKey: "MAIN" }]),
  updateTournamentPhaseGroupMixStrategy: vi.fn(),
}));

vi.mock("@/lib/tournament-scheduling/fixture-generation-service", () => ({
  generateTournamentFixturesForEvent: vi.fn().mockResolvedValue([{ id: "f1" }]),
}));

vi.mock("@/lib/tournament-scheduling/tournament-pitch-service", () => ({
  createTournamentPitch: vi.fn().mockResolvedValue({ id: "pitch-1" }),
}));

vi.mock("@/lib/tournament-scheduling/tournament-break-service", () => ({
  createTournamentBreak: vi.fn(),
}));

vi.mock("@/lib/tournament-scheduling/schedule-version-service", () => ({
  createWorkingTournamentScheduleVersion: vi.fn().mockResolvedValue({ id: "sv-1" }),
}));

vi.mock("../sync-composer-schedule-preview-persistence", () => ({
  syncComposerValidatedScheduleFromDraft: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn().mockResolvedValue({ timezone: "Europe/Zurich" }) },
    event: { findFirst: vi.fn().mockResolvedValue({ id: "event-1" }) },
    tournamentCompetitionConfiguration: { update: vi.fn() },
    tournamentRankingConfiguration: { upsert: vi.fn() },
    tournamentParticipant: {
      findMany: vi.fn().mockResolvedValue([{ id: "p1" }, { id: "p2" }]),
    },
    tournamentFixture: { findMany: vi.fn().mockResolvedValue([]) },
    tournamentScheduleVersion: { findFirst: vi.fn().mockResolvedValue({ id: "sv-1" }) },
  },
}));

function homeDraft() {
  const base = createEmptyTournamentComposerDraft();
  base.homeAway = "HOME";
  base.seasonId = "season-1";
  base.title = "Test";
  base.startAt = "2026-06-01T09:00";
  base.endAt = "2026-06-01T15:00";
  base.participants = [
    {
      localId: "p1",
      kind: "TEAM",
      teamId: "t1",
      displayName: "Team A",
      subLabel: null,
      dressingRooms: [],
    },
    {
      localId: "p2",
      kind: "TEAM",
      teamId: "t2",
      displayName: "Team B",
      subLabel: null,
      dressingRooms: [],
    },
  ];
  base.planner = createDefaultTournamentComposerPlannerDraft();
  base.spielplanCreationEnabled = true;
  return base;
}

describe("01H-R2 — Smart Timing + break UX", () => {
  it("A/C — smart timing visible with canonical 01F1 recommendation values", () => {
    const view = buildTournamentComposerSmartTimingView(homeDraft());
    expect(view.missingInputHint).toBeNull();
    expect(view.liveAssessment).not.toBeNull();
    expect(view.recommendedTiming).not.toBeNull();
    expect(view.recommendedTiming!.matchDurationMinutes).toBeGreaterThan(0);
    expect(view.recommendedTiming!.transitionMinutes).toBeGreaterThanOrEqual(0);
  });

  it("B — missing-input guidance is specific (teams)", () => {
    const draft = homeDraft();
    draft.participants = [];
    expect(composerSmartTimingMissingInputHint(draft)).toMatch(/zwei Teams/i);
  });

  it("B — missing-input guidance is specific (termin)", () => {
    const draft = homeDraft();
    draft.startAt = "";
    expect(composerSmartTimingMissingInputHint(draft)).toMatch(/Turnierbeginn/i);
  });

  it("B — missing-input guidance is specific (fields)", () => {
    const draft = homeDraft();
    draft.planner!.pitches = [];
    expect(composerSmartTimingMissingInputHint(draft)).toMatch(/Turnierfeld/i);
  });

  it("D — apply recommendation populates timing fields", () => {
    const draft = homeDraft();
    const view = buildTournamentComposerSmartTimingView(draft);
    expect(view.recommendedTiming).not.toBeNull();
    const updated = applyComposerRecommendedTiming(draft.planner!, view.recommendedTiming!);
    expect(updated.timing.matchDurationMinutes).toBe(view.recommendedTiming!.matchDurationMinutes);
    expect(updated.timing.transitionMinutes).toBe(view.recommendedTiming!.transitionMinutes);
  });

  it("E/F — manual override and feasibility still computed", () => {
    const draft = homeDraft();
    draft.planner!.timing.matchDurationMinutes = 5;
    const assessment = assessTournamentComposerSmartTiming(draft);
    expect(assessment).not.toBeNull();
    const surface = composerSmartTimingFeasibilitySurface(assessment);
    expect(surface?.title).toBeTruthy();
  });

  it("G/H/I — break inherits date and derives end from duration", () => {
    const br = createDefaultComposerBreakDraft("b1");
    br.startLocalTime = "11:00";
    br.durationMinutes = 15;
    const interval = resolveComposerBreakDateTimes(br, "2026-06-01T09:00");
    expect(interval?.startAt).toBe("2026-06-01T11:00");
    expect(interval?.endAt).toBe("2026-06-01T11:15");
    expect(br.scope).toBe("ALL_PITCHES");
  });

  it("J — selected-pitch break via advanced flow normalizes legacy datetimes", () => {
    const normalized = normalizeComposerBreakDraft({
      localId: "legacy",
      label: "Pause",
      startAt: "2026-06-01T10:00",
      endAt: "2026-06-01T10:30",
      scope: "SELECTED_PITCHES",
      tournamentPitchLocalIds: ["pitch-1"],
      startLocalTime: "",
      durationMinutes: 0,
      fieldSelectionAdvanced: false,
    });
    expect(normalized.startLocalTime).toBe("10:00");
    expect(normalized.durationMinutes).toBe(30);
    expect(normalized.fieldSelectionAdvanced).toBe(true);
  });

  it("K/L — break validation does not require end datetime", () => {
    const draft = homeDraft();
    draft.planner!.breaks = [createDefaultComposerBreakDraft("b1")];
    const errors = validateHomePlannerDraft(draft);
    expect(errors["break-b1"]).toMatch(/Beginn und Dauer/i);
    expect(errors["break-b1"]).not.toMatch(/Ende/i);
  });

  it("M — default match duration is not tournament window duration", () => {
    const planner = createDefaultTournamentComposerPlannerDraft();
    expect(planner.timing.matchDurationMinutes).toBe(12);
    expect(planner.timing.matchDurationMinutes).not.toBe(120);
  });

  it("N/O — HOME with Spielplan enabled has planner tabs; AWAY does not", () => {
    expect(
      buildTournamentCreateTabNavigationConfig({ homeAway: "HOME", spielplanCreationEnabled: true }).tabs.some(
        (t) => t.key === "spielplan",
      ),
    ).toBe(true);
    expect(
      buildTournamentCreateTabNavigationConfig({ homeAway: "HOME", spielplanCreationEnabled: false }).tabs.some(
        (t) => t.key === "spielplan",
      ),
    ).toBe(false);
    expect(
      buildTournamentCreateTabNavigationConfig({ homeAway: "AWAY" }).tabs.some((t) => t.key === "spielplan"),
    ).toBe(false);
  });

  it("P — smart timing works when termin configured after teams (non-linear)", () => {
    const draft = homeDraft();
    draft.startAt = "";
    expect(buildTournamentComposerSmartTimingView(draft).liveAssessment).toBeNull();
    draft.startAt = "2026-06-01T09:00";
    expect(buildTournamentComposerSmartTimingView(draft).liveAssessment).not.toBeNull();
  });

  it("Q — single break validation message key", () => {
    const draft = homeDraft();
    const br = createDefaultComposerBreakDraft("b1");
    draft.planner!.breaks = [br];
    const errors = validateHomePlannerDraft(draft);
    expect(Object.keys(errors).filter((k) => k.startsWith("break-"))).toHaveLength(1);
  });

  it("R — creation→planung integration persists break mapping", async () => {
    const payload = homeDraft();
    const br = createDefaultComposerBreakDraft("b1");
    br.startLocalTime = "12:00";
    br.durationMinutes = 20;
    payload.planner!.breaks = [br];

    await persistTournamentPlannerFromComposer({
      tenantId: "tenant-1",
      tournamentId: "event-1",
      payload,
      planner: payload.planner!,
    });

    const { createTournamentBreak } = await import("@/lib/tournament-scheduling/tournament-break-service");
    expect(createTournamentBreak).toHaveBeenCalledWith(
      "tenant-1",
      "event-1",
      expect.objectContaining({
        scope: "ALL_PITCHES",
        startAt: expect.any(Date),
        endAt: expect.any(Date),
      }),
    );
  });

  it("hydrate normalizes legacy break drafts", () => {
    const payload = homeDraft();
    payload.planner!.breaks = [
      normalizeComposerBreakDraft({
        localId: "x",
        label: "Pause",
        startAt: "2026-06-01T11:00",
        endAt: "2026-06-01T11:15",
        scope: "ALL_PITCHES",
        tournamentPitchLocalIds: [],
        startLocalTime: "",
        durationMinutes: 0,
        fieldSelectionAdvanced: false,
      }),
    ];
    const hydrated = hydrateTournamentComposerFormFromDraft(payload);
    expect(hydrated.planner!.breaks[0]!.startLocalTime).toBe("11:00");
    expect(combineTournamentStartDateWithLocalTime("2026-06-01T09:00", "11:00")).toBe(
      "2026-06-01T11:00",
    );
  });
});

describe("01H-R2 — default match duration root cause guard", () => {
  it("WHY_DEFAULT_MATCH_DURATION_WAS_120_MINUTES — tournament duration prop must not seed match duration", () => {
    const fromDefaults = createDefaultTournamentComposerPlannerDraft();
    expect(fromDefaults.timing.matchDurationMinutes).toBe(12);
    const wronglyMapped = createDefaultTournamentComposerPlannerDraft({
      defaultMatchDurationMinutes: 120,
    });
    expect(wronglyMapped.timing.matchDurationMinutes).toBe(120);
    expect(fromDefaults.timing.matchDurationMinutes).not.toBe(wronglyMapped.timing.matchDurationMinutes);
  });
});
