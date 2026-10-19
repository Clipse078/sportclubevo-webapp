/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { E_FF12_ROTATION_4_TEMPLATE } from "@/lib/tournament-scheduling/programme-templates/catalogue/e-ff12-rotation";
import { G_CURATED_PARTICIPANT_COUNTS } from "@/lib/tournament-scheduling/programme-templates/catalogue/reference-inventory";
import { roundPlayingOverlapsPause } from "@/lib/tournament-scheduling/programme-templates/fixed-pause-round-scheduling";
import {
  TournamentComposerSpielfelderPanel,
  TournamentComposerTurnierformatPanel,
} from "@/components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import {
  assertComposerPitchProposalInvariant,
  resolveEffectiveComposerPlanner,
} from "../resolve-effective-composer-planner";
import {
  buildTournamentSchedulePreview,
  buildComposerSchedulePreviewForDraft,
} from "../tournament-composer-schedule-preview";
import { buildComposerScheduleFitView } from "../tournament-composer-schedule-fit";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const E_TEAM_OPTIONS = [{ id: "team-e1", name: "E1", ageGroup: "E", genderGroup: null }];

function simulateComposerLifecycle(input: {
  participantCount: number;
  categoryContext: "E_FF12" | "F";
  teamId: string;
}) {
  let planner = createDefaultTournamentComposerPlannerDraft();
  const participants = Array.from({ length: input.participantCount }, (_, i) => ({
    localId: `p-${i}`,
    kind: "TEAM" as const,
    teamId: input.teamId,
    displayName: `Team ${i + 1}`,
    subLabel: null,
    dressingRooms: [],
  }));

  planner = resolveEffectiveComposerPlanner({
    planner,
    participantCount: participants.length,
    categoryContext: input.categoryContext,
  });

  assertComposerPitchProposalInvariant({
    planner,
    participantCount: participants.length,
    categoryContext: input.categoryContext,
  });

  const withPause =
    input.categoryContext === "E_FF12"
      ? {
          ...planner,
          mainPause: {
            enabled: true,
            durationMinutes: 10,
            startLocalTime: "11:00",
          },
        }
      : planner;

  return { planner: withPause, participants };
}

describe("SCE-TOURNAMENT-PLANNER-02D R5 PO UAT", () => {
  it("TEST A — proposal materialisation at composer lifecycle boundary (E)", () => {
    const { planner } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    expect(planner.pitches.length).toBe(3);
    expect(planner.pitches.map((p) => p.playersPerSide)).toEqual([3, 3, 6]);
  });

  it("TEST B — field-only proposal materialises F/6", () => {
    const { planner } = simulateComposerLifecycle({
      participantCount: 6,
      categoryContext: "F",
      teamId: "team-f1",
    });
    expect(planner.pitches.length).toBe(4);
    expect(planner.pitches.every((p) => p.playersPerSide != null)).toBe(true);
  });

  it("TEST C — full template materialises E/4", () => {
    const { planner } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    expect(planner.programmeTemplateId).toBe(E_FF12_ROTATION_4_TEMPLATE.id);
    expect(planner.pitches.length).toBe(3);
  });

  it("TEST D — user pitch edit preserved across reconcile", () => {
    const { planner: base, participants } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    const customised = {
      ...base,
      pitchesUserCustomized: true,
      pitches: base.pitches.map((p, i) =>
        i === 0 ? { ...p, label: "Hauptfeld", playersPerSide: 4 } : p,
      ),
    };
    const after = resolveEffectiveComposerPlanner({
      planner: customised,
      participantCount: participants.length,
      categoryContext: "E_FF12",
      preserveUserPitchEdits: true,
    });
    expect(after.pitches[0]?.label).toBe("Hauptfeld");
    expect(after.pitches[0]?.playersPerSide).toBe(4);
  });

  it("TEST E — schedule preview uses team and pitch names", () => {
    const { planner, participants } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.startAt = "2026-06-01T10:00";
    draft.endAt = "2026-06-01T12:00";
    draft.participants = participants;
    draft.planner = planner;

    const preview = buildComposerSchedulePreviewForDraft(draft, "E_FF12");
    expect(preview.status).toBe("OK");
    expect(preview.rounds.length).toBeGreaterThan(0);
    const names = preview.rounds.flatMap((r) =>
      r.fixtures.flatMap((f) => [f.homeDisplayName, f.awayDisplayName]),
    );
    expect(names.some((n) => n.startsWith("Team"))).toBe(true);
    expect(preview.rounds[0]?.roundStartLabel).toMatch(/^\d{2}:\d{2}$/);
  });

  it("TEST F — fit PASS", () => {
    const { planner, participants } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.startAt = "2026-06-01T10:00";
    draft.endAt = "2026-06-01T12:00";
    draft.participants = participants;
    draft.planner = planner;
    const fit = buildComposerScheduleFitView({
      participantCount: 4,
      categoryContext: "E_FF12",
      startAt: draft.startAt,
      endAt: draft.endAt,
      planner,
      payload: draft,
    });
    expect(fit.status).toBe("PASS");
  });

  it("TEST G — fit FAIL", () => {
    const { planner, participants } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.startAt = "2026-06-01T10:00";
    draft.endAt = "2026-06-01T11:15";
    draft.participants = participants;
    draft.planner = planner;
    const fit = buildComposerScheduleFitView({
      participantCount: 4,
      categoryContext: "E_FF12",
      startAt: draft.startAt,
      endAt: draft.endAt,
      planner,
      payload: draft,
    });
    expect(fit.status).toBe("FAIL");
    expect(fit.deficitMinutes).toBeGreaterThan(0);
  });

  it("TEST H — pause overlap is zero for fixed pause scheduling", () => {
    const { planner, participants } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    planner.mainPause = {
      enabled: true,
      durationMinutes: 10,
      startLocalTime: "11:00",
    };
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.startAt = "2026-06-01T10:00";
    draft.endAt = "2026-06-01T12:00";
    draft.participants = participants;
    draft.planner = planner;
    const preview = buildTournamentSchedulePreview({ payload: draft, categoryContext: "E_FF12" });
    expect(preview.status).toBe("OK");
    const pauseStart = new Date("2026-06-01T11:00:00").getTime();
    const pauseEnd = pauseStart + 10 * 60_000;
    for (const round of preview.rounds) {
      for (const fixture of round.fixtures) {
        expect(
          roundPlayingOverlapsPause({
            roundStartUtcMs: fixture.startUtcMs,
            matchDurationMinutes: planner.timing.matchDurationMinutes,
            pause: { startUtcMs: pauseStart, endUtcMs: pauseEnd },
          }),
        ).toBe(false);
      }
    }
  });

  it("TEST I — preview assignment keys are stable for persistence mapping", () => {
    const { planner, participants } = simulateComposerLifecycle({
      participantCount: 6,
      categoryContext: "F",
      teamId: "team-f1",
    });
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.startAt = "2026-06-01T10:00";
    draft.endAt = "2026-06-01T12:00";
    draft.participants = participants;
    draft.planner = planner;
    const preview = buildTournamentSchedulePreview({ payload: draft, categoryContext: "F" });
    expect(preview.status).toBe("OK");
    expect(preview.assignmentPlan.length).toBe(preview.fixtureCount);
    expect(new Set(preview.assignmentPlan.map((a) => a.fixtureKey)).size).toBe(
      preview.assignmentPlan.length,
    );
  });

  it("TEST J — curated Turnierformat hides redundant controls in source", () => {
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).toMatch(/hideRoundRobinMeetings/);
    expect(panels).toMatch(/hideHomeAwayRelevance/);
    expect(panels).not.toMatch(/SCE erstellt den Spielplan danach/);
  });

  it("TEST K — generic path panels still expose legacy controls", () => {
    const legacy = read(
      "components/admin/tournamentcenter/composer/TournamentComposerLegacyTurnierformatPanel.tsx",
    );
    expect(legacy).toMatch(/tournament-meetings-per-opponent/);
    expect(legacy).toMatch(/tournament-home-away-relevance/);
  });

  it("integration — Spielfelder panel renders materialised pitch rows (E/4)", () => {
    const { planner, participants } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    render(
      <TournamentComposerSpielfelderPanel
        planner={planner}
        participantCount={participants.length}
        categoryContext="E_FF12"
        onChange={() => undefined}
      />,
    );
    expect(screen.getAllByTestId(/tournament-composer-pitch-row-/)).toHaveLength(3);
    expect(screen.getByTestId("tournament-pitch-format-" + planner.pitches[0]!.localId)).toBeTruthy();
  });

  it("integration — Turnierformat curated path does not render meetings control", () => {
    const { planner, participants } = simulateComposerLifecycle({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    render(
      <TournamentComposerTurnierformatPanel
        planner={planner}
        participantCount={participants.length}
        categoryContext="E_FF12"
        onChange={() => undefined}
      />,
    );
    expect(screen.queryByTestId("tournament-meetings-per-opponent")).toBeNull();
    expect(screen.queryByTestId("tournament-home-away-relevance")).toBeNull();
  });

  it("G support inventory", () => {
    expect(G_CURATED_PARTICIPANT_COUNTS).toEqual([]);
  });
});
