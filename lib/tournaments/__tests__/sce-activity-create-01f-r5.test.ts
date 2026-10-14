import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import {
  AWAY_TOURNAMENT_ORGANISER_REQUIRED_MESSAGE,
  isAwayTournamentOrganiserMissing,
  resolveEffectiveOrganiserSelection,
} from "@/lib/tournaments/composer/tournament-composer-organiser";
import { buildTournamentCreateReviewSummary } from "@/lib/tournaments/tournament-create-review-summary";
import {
  buildTournamentLobbyParticipantIdentities,
  isDuplicateTournamentParticipant,
} from "@/lib/tournaments/tournament-participant-presentation";
import {
  computeTournamentCreateTabErrors,
  firstInvalidTournamentCreateTab,
} from "@/lib/tournaments/tournament-create-validation";
import {
  resolveTournamentCreateStepValid,
  validateTournamentCreateWorkflowStep,
} from "@/lib/tournaments/tournament-create-step-validation";
import type { TournamentParticipantDraft } from "@/lib/tournaments/create-tournament-orchestration";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function buildFourParticipantAwayDraft() {
  const draft = createEmptyTournamentComposerDraft();
  draft.homeAway = "AWAY";
  draft.seasonId = "season-2026";
  draft.title = "Auswärtsturnier";
  draft.startAt = "2026-10-17T10:00";
  draft.organizerExternalClubId = "club-host";
  draft.organizerExternalClubName = "SV Host";
  draft.participants = [
    {
      localId: "own-1",
      kind: "TEAM",
      teamId: "team-1",
      displayName: "1. Mannschaft",
      subLabel: "FC Allschwil",
      dressingRooms: [],
    },
    {
      localId: "own-2",
      kind: "TEAM",
      teamId: "team-2",
      displayName: "2. Mannschaft",
      subLabel: "FC Allschwil",
      dressingRooms: [],
    },
    {
      localId: "ext-a",
      kind: "EXTERNAL_CLUB",
      externalClubId: "club-a",
      displayName: "External Club A",
      subLabel: "Externer Verein",
      externalClubLogoUrl: null,
      dressingRooms: [],
    },
    {
      localId: "ext-b",
      kind: "EXTERNAL_CLUB",
      externalClubId: "club-b",
      displayName: "External Club B",
      subLabel: "Externer Verein",
      externalClubLogoUrl: null,
      dressingRooms: [],
    },
  ];
  return draft;
}

describe("SCE-ACTIVITY-CREATE-01F-R5 — AWAY organiser + external club integrity + lobby polish", () => {
  it("AWAY organiser is required for teams validation and final tab errors", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "AWAY";
    draft.seasonId = "s1";
    draft.title = "Cup";
    draft.startAt = "2026-10-17T10:00";
    draft.participants = [
      {
        localId: "p1",
        kind: "TEAM",
        teamId: "t1",
        displayName: "Team",
        subLabel: null,
        dressingRooms: [],
      },
    ];

    expect(isAwayTournamentOrganiserMissing(draft)).toBe(true);
    const step = validateTournamentCreateWorkflowStep(draft, "teams");
    expect(step.valid).toBe(false);
    expect(step.fieldErrors?.organizer).toBe(AWAY_TOURNAMENT_ORGANISER_REQUIRED_MESSAGE);
    expect(resolveTournamentCreateStepValid(draft, "teams")).toBe(false);
    expect(computeTournamentCreateTabErrors(draft).teams).toBe(true);
    expect(firstInvalidTournamentCreateTab(computeTournamentCreateTabErrors(draft))).toBe("teams");

    draft.organizerExternalClubId = "club-ext";
    draft.organizerExternalClubName = "FC External";
    expect(isAwayTournamentOrganiserMissing(draft)).toBe(false);
    expect(validateTournamentCreateWorkflowStep(draft, "teams").valid).toBe(true);
  });

  it("HOME teams step stays valid without external organiser draft fields", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.seasonId = "s1";
    draft.title = "Heimturnier";
    draft.startAt = "2026-10-17T10:00";
    draft.homeAway = "HOME";
    draft.participants = [
      {
        localId: "p1",
        kind: "TEAM",
        teamId: "t1",
        displayName: "Team",
        subLabel: null,
        dressingRooms: [],
      },
    ];
    expect(isAwayTournamentOrganiserMissing(draft)).toBe(false);
    expect(validateTournamentCreateWorkflowStep(draft, "teams").valid).toBe(true);
    expect(
      resolveEffectiveOrganiserSelection({
        homeAway: "HOME",
        externalSelection: null,
        tenantClubName: "FC Allschwil",
        tenantLogoUrl: null,
      })?.name,
    ).toBe("FC Allschwil");
  });

  it("incomplete AWAY draft may still pass draft-save validation hook", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toContain("validateDraftForSave: () => ({ valid: true, tabErrors: {} })");
  });

  it("external club participants coexist with multiple own teams (4 total)", () => {
    const draft = buildFourParticipantAwayDraft();
    expect(draft.participants).toHaveLength(4);
    expect(isDuplicateTournamentParticipant(draft.participants, { kind: "EXTERNAL_CLUB", externalClubId: "club-a" })).toBe(
      true,
    );
    expect(isDuplicateTournamentParticipant(draft.participants, { kind: "EXTERNAL_CLUB", externalClubId: "club-c" })).toBe(
      false,
    );

    const identities = buildTournamentLobbyParticipantIdentities({
      participants: draft.participants,
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: "/logo.png",
    });
    expect(identities).toHaveLength(4);
    expect(identities.filter((i) => i.kind === "TEAM")).toHaveLength(2);
    expect(identities.filter((i) => i.kind === "EXTERNAL_CLUB")).toHaveLength(2);

    const summary = buildTournamentCreateReviewSummary({
      payload: draft,
      organizer: { id: "club-host", name: "SV Host", shortName: null },
      pitchHallFacilityGroups: [],
      dressingRoomFacilityGroups: [],
    });
    expect(summary.participantCount).toBe(4);
    expect(summary.ownTeamCount).toBe(2);
    expect(summary.externalClubCount).toBe(2);
  });

  it("commit path maps CLUB_ONLY external participants without CLUB_THEN_TEAM", () => {
    const draft = buildFourParticipantAwayDraft();
    const create = read("lib/tournaments/composer/create-tournament-from-composer.ts");
    expect(create).toContain("isAwayTournamentOrganiserMissing");
    expect(create).not.toContain("CLUB_THEN_TEAM");

    const mapped: TournamentParticipantDraft[] = draft.participants.map((row) => ({
      localId: row.localId,
      kind: row.kind,
      teamId: row.teamId,
      externalClubId: row.externalClubId,
      displayName: row.displayName,
      manualLabel: row.manualLabel,
      externalTeamId: row.externalTeamId,
    }));
    expect(mapped.filter((p) => p.kind === "EXTERNAL_CLUB")).toHaveLength(2);
    expect(mapped.every((p) => p.externalTeamId == null)).toBe(true);
  });

  it("external club selector uses CLUB_ONLY elevated overlay (no popover nesting)", () => {
    const section = read("components/admin/tournamentcenter/TournamentExternalClubsSection.tsx");
    expect(section).toContain('mode="CLUB_ONLY"');
    expect(section).toContain("Verein hinzufügen");
    expect(section).not.toContain("PopoverContent");
    const selector = read("components/sce/club-team-selector/SceClubTeamSelectorDialog.tsx");
    expect(selector).toContain('stackLayer="elevated"');
  });

  it("removes user-facing authoritative location label from tournament composer", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).not.toContain("authoritative Auswärtsangabe");
    expect(form).toContain("Austragungsort");
  });

  it("participant lobby places total under Teilnehmer heading", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toContain("tournament-create-participant-lobby-header");
    expect(form).toContain("Teilnehmer");
    expect(form).toContain("gesamt");
    expect(form).not.toContain("Teilnehmer gesamt");
  });

  it("final review separates sections and shows participant total in lobby header", () => {
    const review = read("components/admin/tournamentcenter/TournamentCreateReviewPanel.tsx");
    expect(review).toContain("tournament-create-review-own-teams");
    expect(review).toContain("tournament-create-review-external-clubs");
    expect(review).toContain("tournament-create-review-participant-total");
    expect(review).toContain("gesamt");
    expect(review).not.toContain("Teilnehmer gesamt");
    expect(review).toContain("Publikation");
  });

  it("participant tiles use compact premium spacing for small lobby counts", () => {
    const tile = read("components/sce/tournament/SceTournamentParticipantTile.tsx");
    expect(tile).toContain("min-h-[8rem]");
    expect(tile).not.toContain("min-h-[11rem]");
  });

  it("draft roundtrip shape preserves four participants and organiser", () => {
    const draft = buildFourParticipantAwayDraft();
    const serialized = JSON.parse(JSON.stringify(draft)) as typeof draft;
    expect(serialized.participants).toHaveLength(4);
    expect(serialized.organizerExternalClubId).toBe("club-host");
    expect(serialized.participants.filter((p) => p.kind === "EXTERNAL_CLUB").map((p) => p.externalClubId)).toEqual([
      "club-a",
      "club-b",
    ]);
  });
});
