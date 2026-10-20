/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { buildComposerSchedulePreviewTimeline } from "../build-composer-schedule-preview-timeline";
import { buildTournamentSchedulePreview } from "../tournament-composer-schedule-preview";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { reconcileComposerPlannerForParticipants } from "../tournament-composer-programme-template";
import { createComposerScheduleRoundBreakDraft } from "../tournament-composer-schedule-round-breaks";
import ComposerSchedulePreviewPresentation from "@/components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation";
import { prepareTournamentComposerProposal } from "../prepare-tournament-composer-proposal";
import { resolveAuthoritativeTeamJuniorCategoryCode } from "@/lib/teams/jahrgang-rules";
import { resolveProgrammeCategoryFromComposerParticipants } from "@/lib/tournament-scheduling/programme-templates/programme-template-category";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function buildE4PreviewWithPause(input?: {
  transitionMinutes?: number;
  matchDurationMinutes?: number;
}) {
  const planner = reconcileComposerPlannerForParticipants({
    planner: createDefaultTournamentComposerPlannerDraft(),
    participantCount: 4,
    categoryContext: "E_FF12",
  });
  planner.timing.matchDurationMinutes = input?.matchDurationMinutes ?? 10;
  planner.timing.transitionMinutes = input?.transitionMinutes ?? 5;
  planner.scheduleRoundBreaks = [
    createComposerScheduleRoundBreakDraft({ afterRoundNumber: 4, durationMinutes: 10 }),
  ];

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
    externalClubLogoUrl: i === 0 ? "https://example.com/crest.png" : null,
  }));
  draft.planner = planner;

  return buildTournamentSchedulePreview({ payload: draft, categoryContext: "E_FF12" });
}

describe("SCE-TOURNAMENT-PLANNER-02D R9 — Spielplan presentation", () => {
  describe("A — HOME/AWAY option removal", () => {
    it("composer legacy Turnierformat panel has no home/away control", () => {
      const legacy = read(
        "components/admin/tournamentcenter/composer/TournamentComposerLegacyTurnierformatPanel.tsx",
      );
      expect(legacy).not.toMatch(/Heim-/);
      expect(legacy).not.toMatch(/tournament-home-away-relevance/);
      expect(legacy).not.toMatch(/hideHomeAwayRelevance/);
    });

    it("planung Spielplan settings has no home/away control", () => {
      const settings = read(
        "components/admin/tournamentcenter/planung/TournamentPlanungSpielplanSettings.tsx",
      );
      expect(settings).not.toMatch(/planung-home-away-relevance/);
      expect(settings).not.toMatch(/Heim-/);
    });

    it("composer panels do not reference hideHomeAwayRelevance", () => {
      const panels = read(
        "components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx",
      );
      expect(panels).not.toMatch(/hideHomeAwayRelevance/);
    });
  });

  describe("B — match card presentation", () => {
    it("uses canonical stacked fixture identity in preview UI", () => {
      const presentation = read(
        "components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation.tsx",
      );
      const fixtureCard = read(
        "components/sce/tournament/SceTournamentSpielplanPreviewFixtureCard.tsx",
      );
      expect(presentation).toMatch(/SceTournamentSpielplanPreviewFixtureCard/);
      expect(fixtureCard).toMatch(/SceTournamentFixtureCompactMatchup/);
      expect(fixtureCard).toMatch(/layout="spielplan"/);
      expect(fixtureCard).toMatch(/SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS/);
    });

    it("renders field, format and canonical matchup in DOM", () => {
      const preview = buildE4PreviewWithPause();
      expect(preview.status).toBe("OK");
      const draft = createEmptyTournamentComposerDraft();
      draft.participants = Array.from({ length: 4 }, (_, i) => ({
        localId: `p${i}`,
        kind: "TEAM" as const,
        teamId: "team-e1",
        displayName: `Team ${i + 1}`,
        subLabel: null,
        dressingRooms: [],
      }));

      render(
        <ComposerSchedulePreviewPresentation
          payload={draft}
          timelineItems={preview.timelineItems}
          summaryLine="10:00 Start"
          tenantClubName="Test Club"
          tenantLogoUrl="https://example.com/tenant.png"
        />,
      );

      expect(screen.getAllByTestId("sce-tournament-fixture-compact-matchup").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/3v3|4v4|6v6/).length).toBeGreaterThan(0);
    });
  });

  describe("C — chronological pause", () => {
    it("orders R1–R4, BREAK, R5 for pause after round 4", () => {
      const preview = buildE4PreviewWithPause({ transitionMinutes: 5, matchDurationMinutes: 10 });
      expect(preview.status).toBe("OK");
      const kinds = preview.timelineItems.map((item) =>
        item.kind === "ROUND" ? `R${item.roundNumber}@${item.roundStartLabel}` : "BREAK",
      );
      expect(kinds.slice(0, 6)).toEqual([
        "R1@10:00",
        "R2@10:15",
        "R3@10:30",
        "R4@10:45",
        "BREAK",
        "R5@11:10",
      ]);
    });

    it("does not append pause after all rounds only", () => {
      const preview = buildE4PreviewWithPause();
      const breakIndex = preview.timelineItems.findIndex((i) => i.kind === "BREAK");
      const lastRoundIndex = preview.timelineItems.findIndex(
        (i) => i.kind === "ROUND" && i.roundNumber === preview.roundCount,
      );
      expect(breakIndex).toBeGreaterThan(-1);
      expect(lastRoundIndex).toBeGreaterThan(breakIndex);
    });

    it("buildComposerSchedulePreviewTimeline matches preview.timelineItems", () => {
      const preview = buildE4PreviewWithPause();
      const breakItem = preview.timelineItems.find((i) => i.kind === "BREAK");
      expect(breakItem?.kind).toBe("BREAK");
      const rebuilt = buildComposerSchedulePreviewTimeline({
        rounds: preview.rounds,
        fixedPause:
          breakItem?.kind === "BREAK"
            ? {
                startUtcMs: breakItem.startUtcMs,
                endUtcMs: breakItem.endUtcMs,
                durationMinutes: breakItem.durationMinutes,
              }
            : null,
      });
      expect(rebuilt.map((i) => i.kind)).toEqual(preview.timelineItems.map((i) => i.kind));
    });
  });

  describe("D — live recalculation", () => {
    it("changing Wechselzeit shifts later rounds and derived pause placement", () => {
      const short = buildE4PreviewWithPause({ transitionMinutes: 5 });
      const long = buildE4PreviewWithPause({ transitionMinutes: 10 });
      expect(short.status).toBe("OK");
      expect(long.status).toBe("OK");

      const shortR5 = short.timelineItems.find((i) => i.kind === "ROUND" && i.roundNumber === 5);
      const longR5 = long.timelineItems.find((i) => i.kind === "ROUND" && i.roundNumber === 5);
      expect(shortR5?.kind).toBe("ROUND");
      expect(longR5?.kind).toBe("ROUND");
      if (shortR5?.kind === "ROUND" && longR5?.kind === "ROUND") {
        expect(longR5.roundStartUtcMs).toBeGreaterThan(shortR5.roundStartUtcMs);
      }
    });
  });

  describe("E — R8 regression", () => {
    it("REAL FCA E1 shape still preconfigures FULL_TEMPLATE automatically", () => {
      const juniorCode = resolveAuthoritativeTeamJuniorCategoryCode({
        ageGroup: null,
        shortName: "Junioren E1",
        alternativeName: "E1",
      });
      const { categoryContext } = resolveProgrammeCategoryFromComposerParticipants({
        participants: [
          {
            kind: "TEAM",
            teamId: "fca-e1",
            teamJuniorCategoryCode: juniorCode,
          },
        ],
        teamAgeGroupById: new Map(),
      });
      expect(categoryContext).toBe("E_FF12");

      const participants = Array.from({ length: 4 }, (_, i) => ({
        localId: `p${i}`,
        kind: "TEAM" as const,
        teamId: "fca-e1",
        teamJuniorCategoryCode: juniorCode,
        displayName: `Team ${i + 1}`,
        subLabel: null,
        dressingRooms: [],
      }));
      const prepared = prepareTournamentComposerProposal({
        participants,
        planner: createDefaultTournamentComposerPlannerDraft(),
      });
      expect(prepared.proposal.kind).toBe("FULL_TEMPLATE");
    });
  });
});
