import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { E_FF12_ROTATION_4_TEMPLATE } from "@/lib/tournament-scheduling/programme-templates/catalogue/e-ff12-rotation";
import {
  buildComposerScheduleFitView,
  materializeComposerPitchesFromTemplate,
  reconcileComposerPlannerForParticipants,
  resolveComposerProgrammeTemplate,
} from "../tournament-composer-programme-template";
import {
  addComposerPlayingUnitSubunit,
  splitComposerParticipantIntoDefaultSubunits,
} from "../tournament-composer-playing-units";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-02D R1 PO UAT — creator corrections", () => {
  it("A — team splitting reuses canonical draft split without unit cap", () => {
    const units = splitComposerParticipantIntoDefaultSubunits({
      participantLocalId: "p1",
      baseDisplayName: "FC Allschwil Junioren F2",
      nextLocalId: () => "u1",
    });
    expect(units).toHaveLength(2);
    const more = addComposerPlayingUnitSubunit({
      units,
      baseDisplayName: "FC Allschwil Junioren F2",
      nextLocalId: () => "u3",
    });
    expect(more.length).toBe(3);
    expect(read("lib/tournaments/composer/create-tournament-from-composer.ts")).toMatch(
      /createTournamentParticipantUnit/,
    );
  });

  it("B — template field authority is not participantCount/2 formula", () => {
    const resolved = resolveComposerProgrammeTemplate({ participantCount: 4, categoryContext: "E_FF12" });
    expect(resolved?.proposal.template?.fields).toHaveLength(3);
    const sixTeam = resolveComposerProgrammeTemplate({ participantCount: 6, categoryContext: "E_FF12" });
    expect(sixTeam?.proposal.template?.fields.length).not.toBe(4 / 2);
    expect(sixTeam?.proposal.template?.fields.length).toBeGreaterThan(0);
  });

  it("C — 4-team reference preserves exact field formats", () => {
    const pitches = materializeComposerPitchesFromTemplate(E_FF12_ROTATION_4_TEMPLATE);
    expect(pitches.map((p) => p.playersPerSide)).toEqual([3, 3, 6]);
    expect(E_FF12_ROTATION_4_TEMPLATE.rounds).toHaveLength(6);
  });

  it("D — Spielplan panel orders pause before Spieldauer and Wechselzeit", () => {
    const panel = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    const pauseIdx = panel.indexOf("Grössere Turnierpause");
    const durationIdx = panel.indexOf("Spieldauer (Min.)");
    const transitionIdx = panel.indexOf("Wechselzeit (Min.)");
    expect(pauseIdx).toBeGreaterThan(-1);
    expect(durationIdx).toBeGreaterThan(pauseIdx);
    expect(transitionIdx).toBeGreaterThan(durationIdx);
  });

  it("E — fit calculation PASS, exact, FAIL and recalculates on timing inputs", () => {
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
    expect(fail.deficitMinutes).toBe(97 - 90);

    const pauseOff = buildComposerScheduleFitView({
      participantCount: 4,
      categoryContext: "E_FF12",
      startAt: "2026-06-01T10:00",
      endAt: "2026-06-01T12:00",
      planner: {
        ...planner,
        mainPause: { enabled: false, durationMinutes: 10, startLocalTime: "11:00" },
      },
    });
    expect(pauseOff.requiredMinutes).toBeLessThan(pass.requiredMinutes!);

    const shorterMatches = buildComposerScheduleFitView({
      participantCount: 4,
      categoryContext: "E_FF12",
      startAt: "2026-06-01T10:00",
      endAt: "2026-06-01T12:00",
      planner: {
        ...planner,
        timing: { ...planner.timing, matchDurationMinutes: 10 },
      },
    });
    expect(shorterMatches.requiredMinutes!).toBeLessThan(pass.requiredMinutes!);
  });

  it("F — fit view never mutates draft timing fields", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.startAt = "2026-06-01T10:00";
    draft.endAt = "2026-06-01T12:00";
    draft.participants = Array.from({ length: 4 }, (_, i) => ({
      localId: `p${i}`,
      kind: "MANUAL",
      manualLabel: `T${i + 1}`,
      displayName: `T${i + 1}`,
      subLabel: null,
      dressingRooms: [],
    }));
    draft.planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: null,
    });
    const timingBefore = { ...draft.planner!.timing };
    const pauseBefore = { ...draft.planner!.mainPause! };
    buildComposerScheduleFitView({
      participantCount: 4,
      categoryContext: null,
      startAt: draft.startAt,
      endAt: draft.endAt,
      planner: draft.planner!,
    });
    expect(draft.planner!.timing).toEqual(timingBefore);
    expect(draft.planner!.mainPause).toEqual(pauseBefore);
  });

  it("G — smart timing recommendation UX removed from creator", () => {
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).not.toMatch(/SmartTimingPanel|smart-timing/);
  });

  it("H — unsupported curated count keeps TP01 fallback without artificial max", () => {
    const resolved = resolveComposerProgrammeTemplate({ participantCount: 17, categoryContext: "E_FF12" });
    expect(resolved).toBeNull();
    const reconciled = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 17,
      categoryContext: "E_FF12",
    });
    expect(reconciled.programmeTemplateId).toBeNull();
  });

  it("participant change preserves customised labels when fingerprint unchanged", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    const customized = {
      ...planner,
      pitchesUserCustomized: true,
      pitches: planner.pitches.map((p) => ({ ...p, label: "Custom", userLabelCustomized: true })),
    };
    const again = reconcileComposerPlannerForParticipants({
      planner: customized,
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(again.pitches.every((p) => p.label === "Custom")).toBe(true);
    expect(again.pitches).toHaveLength(3);
  });
});
