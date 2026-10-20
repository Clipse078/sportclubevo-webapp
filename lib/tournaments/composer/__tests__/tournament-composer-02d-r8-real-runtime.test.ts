/**
 * SCE-TOURNAMENT-PLANNER-02D R8 — STAGE-shaped server/client contract + preconfiguration pipeline.
 */

import { describe, expect, it } from "vitest";
import { resolveAuthoritativeTeamJuniorCategoryCode } from "@/lib/teams/jahrgang-rules";
import { buildTeamJuniorCategoryLookup } from "@/lib/tournaments/composer/resolve-composer-programme-category-context";
import { prepareTournamentComposerProposal } from "@/lib/tournaments/composer/prepare-tournament-composer-proposal";
import { createDefaultTournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-defaults";
import { buildTournamentSchedulePreview } from "@/lib/tournaments/composer/tournament-composer-schedule-preview";
import { hydrateTournamentComposerFormFromDraft } from "@/lib/tournaments/composer/hydrate-tournament-composer-form-from-draft";
import { createEmptyTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { TournamentTeamOption } from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";
import { makeTournamentComposerTeamOption } from "@/components/admin/tournamentcenter/__tests__/tournament-form-test-helpers";

/** Read-only STAGE FC Allschwil team rows (2026-03) — do not mutate. */
const FCA_STAGE_JUNIOR_ROWS = [
  {
    id: "fca-e1",
    name: "FC Allschwil Junioren E1",
    shortName: "Junioren E1",
    alternativeName: "E1",
    ageGroup: null as string | null,
    genderGroup: null as string | null,
  },
  {
    id: "fca-e3",
    name: "FC Allschwil Junioren E3",
    shortName: "Junioren E3",
    alternativeName: null as string | null,
    ageGroup: null as string | null,
    genderGroup: null as string | null,
  },
  {
    id: "fca-f1",
    name: "FC Allschwil Junioren F1",
    shortName: "Junioren F1",
    alternativeName: null as string | null,
    ageGroup: null as string | null,
    genderGroup: null as string | null,
  },
  {
    id: "fca-f2",
    name: "FC Allschwil Junioren F2",
    shortName: "Junioren F2",
    alternativeName: "F2",
    ageGroup: null as string | null,
    genderGroup: null as string | null,
  },
] as const;

function mapStageRowToTeamOption(row: (typeof FCA_STAGE_JUNIOR_ROWS)[number]): TournamentTeamOption {
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    alternativeName: row.alternativeName,
    ageGroup: row.ageGroup,
    genderGroup: row.genderGroup,
    juniorCategoryCode: resolveAuthoritativeTeamJuniorCategoryCode({
      ageGroup: row.ageGroup,
      shortName: row.shortName,
      alternativeName: row.alternativeName,
    }),
  };
}

function stageTeamOptions(): TournamentTeamOption[] {
  return FCA_STAGE_JUNIOR_ROWS.map(mapStageRowToTeamOption);
}

function teamParticipants(teamId: string, count: number, team: TournamentTeamOption) {
  return Array.from({ length: count }, (_, i) => ({
    localId: `${teamId}-${i}`,
    kind: "TEAM" as const,
    teamId,
    teamAgeGroup: team.ageGroup,
    teamJuniorCategoryCode: team.juniorCategoryCode,
    displayName: team.name,
    subLabel: "FC Allschwil",
    dressingRooms: [] as [],
  }));
}

describe("SCE-TOURNAMENT-PLANNER-02D R8 — real runtime pipeline", () => {
  it("REAL_SERVER_CLIENT_E_FLOW — STAGE rows resolve junior codes at server boundary", () => {
    const options = stageTeamOptions();
    expect(options.find((t) => t.id === "fca-e1")?.juniorCategoryCode).toBe("E");
    expect(options.find((t) => t.id === "fca-e3")?.juniorCategoryCode).toBe("E");
    expect(options.find((t) => t.id === "fca-f1")?.juniorCategoryCode).toBe("F");
    expect(options.find((t) => t.id === "fca-f2")?.juniorCategoryCode).toBe("F");
  });

  it("REAL_SELECTOR_PARTICIPANT_E_FLOW — participant snapshot carries resolved category", () => {
    const team = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[0]!);
    const participants = teamParticipants("fca-e1", 1, team);
    const lookup = buildTeamJuniorCategoryLookup([team]);
    const prepared = prepareTournamentComposerProposal({
      participants,
      planner: createDefaultTournamentComposerPlannerDraft(),
      teamJuniorCategoryById: lookup,
    });
    expect(prepared.categoryContext).toBe("E_FF12");
    expect(participants[0]?.teamJuniorCategoryCode).toBe("E");
  });

  it("REAL_E4_AUTOMATIC_PRECONFIGURATION", () => {
    const team = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[0]!);
    const participants = teamParticipants("fca-e1", 4, team);
    const prepared = prepareTournamentComposerProposal({
      participants,
      planner: createDefaultTournamentComposerPlannerDraft(),
      teamJuniorCategoryById: buildTeamJuniorCategoryLookup([team]),
    });
    expect(prepared.proposal.kind).toBe("FULL_TEMPLATE");
    expect(prepared.planner.pitches).toHaveLength(3);
    expect(prepared.planner.pitches.map((p) => p.playersPerSide)).toEqual([3, 3, 6]);
  });

  it("REAL_E4_LIVE_SPIELPLAN", () => {
    const team = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[0]!);
    const participants = teamParticipants("fca-e1", 4, team);
    const prepared = prepareTournamentComposerProposal({
      participants,
      planner: createDefaultTournamentComposerPlannerDraft(),
      teamJuniorCategoryById: buildTeamJuniorCategoryLookup([team]),
    });
    const preview = buildTournamentSchedulePreview({
      payload: {
        ...createEmptyTournamentComposerDraft(),
        homeAway: "HOME",
        startAt: "2026-06-01T08:00:00.000Z",
        endAt: "2026-06-01T12:00:00.000Z",
        participants,
        planner: prepared.planner,
      },
      categoryContext: prepared.categoryContext,
    });
    expect(preview.status).toBe("OK");
    expect(preview.fixtureCount).toBeGreaterThan(0);
    expect(preview.roundCount).toBeGreaterThan(0);
  });

  it("REAL_F_AUTOMATIC_PRECONFIGURATION", () => {
    const team = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[2]!);
    const participants = teamParticipants("fca-f1", 6, team);
    const prepared = prepareTournamentComposerProposal({
      participants,
      planner: createDefaultTournamentComposerPlannerDraft(),
      teamJuniorCategoryById: buildTeamJuniorCategoryLookup([team]),
    });
    expect(prepared.categoryContext).toBe("F");
    expect(prepared.proposal.kind).toBe("FIELD_PROPOSAL_ONLY");
    expect(prepared.planner.pitches.length).toBeGreaterThan(1);
    expect(prepared.planner.pitches.every((p) => p.playersPerSide != null)).toBe(true);
  });

  it("USER_OVERRIDE_PRESERVATION", () => {
    const team = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[0]!);
    const participants = teamParticipants("fca-e1", 4, team);
    const customised = {
      ...createDefaultTournamentComposerPlannerDraft(),
      pitchesUserCustomized: true,
      pitches: [
        {
          localId: "p1",
          label: "Hauptfeld",
          playersPerSide: 4 as number,
          userLabelCustomized: true,
        },
      ],
    };
    const prepared = prepareTournamentComposerProposal({
      participants,
      planner: customised,
      teamJuniorCategoryById: buildTeamJuniorCategoryLookup([team]),
      preserveUserPitchEdits: true,
    });
    expect(prepared.planner.pitches[0]?.label).toBe("Hauptfeld");
    expect(prepared.planner.pitchesUserCustomized).toBe(true);
  });

  it("HYDRATED_DRAFT_FLOW", () => {
    const team = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[0]!);
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.startAt = "2026-06-01T10:00:00.000Z";
    draft.endAt = "2026-06-01T12:00:00.000Z";
    draft.participants = teamParticipants("fca-e1", 4, team);
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    draft.spielplanCreationEnabled = true;
    const hydrated = hydrateTournamentComposerFormFromDraft(draft, { teamOptions: [team] });
    expect(hydrated.planner?.pitches).toHaveLength(3);
  });

  it("UNKNOWN_CATEGORY_GENERIC_FLOW", () => {
    const adult = makeTournamentComposerTeamOption({
      id: "aktive",
      name: "FC Allschwil 1. Mannschaft",
      shortName: "1. Mannschaft",
      ageGroup: "Aktive",
    });
    const participants = teamParticipants("aktive", 2, adult);
    const prepared = prepareTournamentComposerProposal({
      participants,
      planner: createDefaultTournamentComposerPlannerDraft(),
      teamJuniorCategoryById: buildTeamJuniorCategoryLookup([adult]),
    });
    expect(prepared.categoryContext).toBeNull();
    expect(prepared.proposal.kind).toBe("NONE");
    expect(prepared.planner.pitches).toHaveLength(1);
  });

  it("MIXED_CATEGORY_GENERIC_FLOW", () => {
    const eTeam = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[0]!);
    const fTeam = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[2]!);
    const participants = [
      ...teamParticipants("fca-e1", 1, eTeam),
      ...teamParticipants("fca-f1", 1, fTeam),
    ];
    const prepared = prepareTournamentComposerProposal({
      participants,
      planner: createDefaultTournamentComposerPlannerDraft(),
      teamJuniorCategoryById: buildTeamJuniorCategoryLookup([eTeam, fTeam]),
    });
    expect(prepared.categoryContext).toBeNull();
    expect(prepared.proposal.kind).toBe("NONE");
  });

  it("CREATION_PAYLOAD_PARITY", () => {
    const team = mapStageRowToTeamOption(FCA_STAGE_JUNIOR_ROWS[0]!);
    const participants = teamParticipants("fca-e1", 4, team);
    const prepared = prepareTournamentComposerProposal({
      participants,
      planner: createDefaultTournamentComposerPlannerDraft(),
      teamJuniorCategoryById: buildTeamJuniorCategoryLookup([team]),
    });
    const payloadPlanner = prepared.planner;
    const preview = buildTournamentSchedulePreview({
      payload: {
        ...createEmptyTournamentComposerDraft(),
        homeAway: "HOME",
        startAt: "2026-06-01T08:00:00.000Z",
        endAt: "2026-06-01T12:00:00.000Z",
        participants,
        planner: payloadPlanner,
      },
      categoryContext: prepared.categoryContext,
    });
    expect(payloadPlanner.programmeTemplateId).toBeTruthy();
    expect(preview.status).toBe("OK");
  });
});
