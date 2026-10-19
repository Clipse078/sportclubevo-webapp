import { describe, expect, it } from "vitest";
import { E_FF12_ROTATION_4_TEMPLATE } from "@/lib/tournament-scheduling/programme-templates/catalogue/e-ff12-rotation";
import { buildInstantiatedProgrammePlan } from "@/lib/tournament-scheduling/programme-templates/instantiate-programme-template";
import { mapParticipantsToTemplateSlots } from "@/lib/tournament-scheduling/programme-templates/participant-slot-mapping";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { resolveEffectiveComposerPlanner } from "../resolve-effective-composer-planner";
import { buildTournamentSchedulePreview } from "../tournament-composer-schedule-preview";

function buildDraft(input: {
  participantCount: number;
  categoryContext: "E_FF12" | "F" | null;
  teamId: string;
  startAt?: string;
  endAt?: string;
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

  if (input.categoryContext) {
    planner = resolveEffectiveComposerPlanner({
      planner,
      participantCount: participants.length,
      categoryContext: input.categoryContext,
    });
  }

  const draft = createEmptyTournamentComposerDraft();
  draft.homeAway = "HOME";
  draft.startAt = input.startAt ?? "2026-06-01T10:00";
  draft.endAt = input.endAt ?? "2026-06-01T12:00";
  draft.participants = participants;
  draft.planner = planner;
  return { draft, planner, participants };
}

describe("SCE-TOURNAMENT-PLANNER-02D R5A schedule preview paths", () => {
  it("FULL_TEMPLATE — E/4 uses real slot mapping and generates timed rounds", () => {
    const participantCount = 4;
    const orderingRows = Array.from({ length: participantCount }, (_, i) => ({
      id: `p-${i}`,
      displayOrder: i,
    }));
    const slotMapping = mapParticipantsToTemplateSlots({
      participants: orderingRows,
      participantCount,
    });
    expect(Object.keys(slotMapping).length).toBeGreaterThan(0);
    expect(slotMapping.A).toBeDefined();

    const plan = buildInstantiatedProgrammePlan({
      template: E_FF12_ROTATION_4_TEMPLATE,
      slotMapping,
    });
    expect(plan.fixtures.length).toBeGreaterThan(0);

    const { draft } = buildDraft({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
    });
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: "E_FF12",
    });
    expect(preview.path).toBe("FULL_TEMPLATE");
    expect(preview.status).toBe("OK");
    expect(preview.roundCount).toBeGreaterThan(0);
    expect(preview.rounds[0]?.fixtures[0]?.startUtcMs).toBeGreaterThan(0);
    expect(preview.rounds[0]?.roundStartLabel).toMatch(/^\d{2}:\d{2}$/);
  });

  it("FIELD_PROPOSAL_ONLY — F/6 preview without template slot mapping", () => {
    const { draft, planner } = buildDraft({
      participantCount: 6,
      categoryContext: "F",
      teamId: "team-f1",
    });
    expect(planner.programmeTemplateId).toBeNull();
    expect(planner.pitches.length).toBeGreaterThan(0);

    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: "F",
    });
    expect(preview.path).toBe("FIELD_ONLY");
    expect(preview.status).toBe("OK");
    expect(preview.fixtureCount).toBeGreaterThan(0);
    expect(preview.rounds.every((r) => r.fixtures.every((f) => f.pitchLabel.length > 0))).toBe(
      true,
    );
  });

  it("GENERIC — unsupported category uses TP01 round-robin without template slots", () => {
    const { draft } = buildDraft({
      participantCount: 4,
      categoryContext: null,
      teamId: "team-x",
    });
    draft.planner!.pitches = [
      {
        localId: "pitch-1",
        label: "Feld 1",
        playersPerSide: 5,
        templateFieldKey: null,
        displayOrder: 0,
      },
      {
        localId: "pitch-2",
        label: "Feld 2",
        playersPerSide: 5,
        templateFieldKey: null,
        displayOrder: 1,
      },
    ];

    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: null,
    });
    expect(preview.path).toBe("GENERIC");
    expect(preview.status).toBe("OK");
    expect(preview.fixtureCount).toBeGreaterThan(0);
  });

  it("fit PASS and FAIL remain available on template path", () => {
    const passDraft = buildDraft({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
      endAt: "2026-06-01T12:00",
    }).draft;
    const passPreview = buildTournamentSchedulePreview({
      payload: passDraft,
      categoryContext: "E_FF12",
    });
    expect(passPreview.fitStatus).toBe("PASS");

    const failDraft = buildDraft({
      participantCount: 4,
      categoryContext: "E_FF12",
      teamId: "team-e1",
      endAt: "2026-06-01T10:45",
    }).draft;
    const failPreview = buildTournamentSchedulePreview({
      payload: failDraft,
      categoryContext: "E_FF12",
    });
    expect(failPreview.fitStatus).toBe("FAIL");
    expect(failPreview.deficitMinutes).toBeGreaterThan(0);
  });
});
