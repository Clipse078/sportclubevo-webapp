/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { buildTournamentSchedulePreview } from "../tournament-composer-schedule-preview";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { reconcileComposerPlannerForParticipants } from "../tournament-composer-programme-template";
import { createComposerScheduleRoundBreakDraft } from "../tournament-composer-schedule-round-breaks";
import ComposerSchedulePreviewPresentation from "@/components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation";
import SceTournamentSpielplanPreviewFixtureCard from "@/components/sce/tournament/SceTournamentSpielplanPreviewFixtureCard";
import { prepareTournamentComposerProposal } from "../prepare-tournament-composer-proposal";
import { resolveAuthoritativeTeamJuniorCategoryCode } from "@/lib/teams/jahrgang-rules";
import { resolveProgrammeCategoryFromComposerParticipants } from "@/lib/tournament-scheduling/programme-templates/programme-template-category";
import { resolveComposerSpielplanCreationEnabled } from "../resolve-composer-spielplan-creation-enabled";
import {
  expectCanonicalStackedFixtureIdentity,
} from "@/components/sce/tournament/__tests__/fixture-identity-order-assertions";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function buildPreview(input?: {
  participantNames?: [string, string, string, string];
  breaks?: { afterRoundNumber: number; durationMinutes: number }[];
  playersPerSide?: number | null;
}) {
  const planner = reconcileComposerPlannerForParticipants({
    planner: createDefaultTournamentComposerPlannerDraft(),
    participantCount: 4,
    categoryContext: "E_FF12",
  });
  planner.timing.matchDurationMinutes = 10;
  planner.timing.transitionMinutes = 5;
  planner.scheduleRoundBreaks = (input?.breaks ?? []).map((b) =>
    createComposerScheduleRoundBreakDraft({
      afterRoundNumber: b.afterRoundNumber,
      durationMinutes: b.durationMinutes,
    }),
  );

  const draft = createEmptyTournamentComposerDraft();
  draft.homeAway = "HOME";
  draft.spielplanCreationEnabled = true;
  draft.startAt = "2026-06-01T10:00";
  draft.endAt = "2026-06-01T13:00";
  const names = input?.participantNames ?? ["Team 1", "Team 2", "Team 3", "Team 4"];
  draft.participants = names.map((displayName, i) => ({
    localId: `p${i}`,
    kind: "TEAM" as const,
    teamId: "team-e1",
    displayName,
    subLabel: null,
    dressingRooms: [],
    externalClubLogoUrl: i === 0 ? "https://example.com/crest-a.png" : i === 1 ? "https://example.com/crest-b.png" : null,
  }));
  draft.planner = planner;

  if (input?.playersPerSide !== undefined) {
    for (const pitch of draft.planner!.pitches) {
      pitch.playersPerSide = input.playersPerSide;
    }
  }

  return {
    draft,
    preview: buildTournamentSchedulePreview({ payload: draft, categoryContext: "E_FF12" }),
  };
}

const side = (label: string, crest: string | null): TournamentPlanungFixtureSidePresentation => ({
  label,
  crestUrl: crest,
  isPlaceholder: false,
  participantId: label,
  qualificationProvenanceLabel: null,
});

describe("SCE-TOURNAMENT-PLANNER-02D R12 — Spielplan match card presentation", () => {
  it("A — reuses SceMatchStackedFixtureIdentity via spielplan layout", () => {
    const compact = read("components/sce/tournament/SceTournamentFixtureCompactMatchup.tsx");
    expect(compact).toMatch(/SceMatchStackedFixtureIdentity/);
    expect(compact).toMatch(/layout === "spielplan"/);
  });

  it("B/C/D/E — participant order, crests, field, fallback", () => {
    render(
      <SceTournamentSpielplanPreviewFixtureCard
        fixtureKey="f1"
        pitchLabel="Feld 1"
        playersPerSide={3}
        sideA={side("AS Timau", "https://example.com/a.png")}
        sideB={side("FC Allschwil", null)}
      />,
    );
    const card = screen.getByTestId("tournament-composer-schedule-fixture-f1");
    expect(screen.getByTestId("sce-tournament-spielplan-fixture-field")).toHaveTextContent("Feld 1");
    expectCanonicalStackedFixtureIdentity(card);
    const sides = card.querySelectorAll("[data-sce-match-side]");
    expect(sides[0]).toHaveAttribute("data-sce-match-side", "home");
    expect(sides[1]).toHaveAttribute("data-sce-match-side", "away");
    expect(within(card).getByText("AS Timau")).toBeInTheDocument();
    expect(within(card).getByText("FC Allschwil")).toBeInTheDocument();
    expect(within(card).getByTestId("club-crest-image")).toBeInTheDocument();
    expect(within(card).getByTestId("club-crest-fallback-initials")).toBeInTheDocument();
  });

  it("F/G — playing format optional", () => {
    const { unmount } = render(
      <SceTournamentSpielplanPreviewFixtureCard
        fixtureKey="fmt"
        pitchLabel="Feld 2"
        playersPerSide={4}
        sideA={side("A", null)}
        sideB={side("B", null)}
      />,
    );
    expect(screen.getByTestId("sce-tournament-spielplan-fixture-format")).toHaveTextContent("4v4");
    unmount();

    render(
      <SceTournamentSpielplanPreviewFixtureCard
        fixtureKey="nofmt"
        pitchLabel="Feld 2"
        playersPerSide={null}
        sideA={side("A", null)}
        sideB={side("B", null)}
      />,
    );
    expect(screen.queryByTestId("sce-tournament-spielplan-fixture-format")).toBeNull();
    expect(screen.queryByText(/Nicht festgelegt/i)).toBeNull();
  });

  it("H/I — no Heim/Auswärts or fake status in preview presentation", () => {
    const presentation = read(
      "components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation.tsx",
    );
    expect(presentation).toMatch(/buildComposerParticipantFixtureSidePresentation/);
    expect(presentation).not.toMatch(/externalClubLogoUrl/);
    expect(presentation).not.toMatch(/Heim|Auswärts|Geplant/i);
    const card = read("components/sce/tournament/SceTournamentSpielplanPreviewFixtureCard.tsx");
    expect(card).not.toMatch(/Heim|Auswärts|Geplant/i);
  });

  it("J — fixture cards omit duplicate round kickoff", () => {
    const { draft, preview } = buildPreview();
    expect(preview.status).toBe("OK");
    render(
      <ComposerSchedulePreviewPresentation
        payload={draft}
        timelineItems={preview.timelineItems}
        summaryLine="10:00 Start"
        tenantClubName="Test Club"
        tenantLogoUrl="https://example.com/tenant.png"
      />,
    );
    const round1 = screen.getByTestId("tournament-composer-schedule-round-1");
    expect(within(round1).getByText("10:00")).toBeInTheDocument();
    const fixtures = within(round1).getAllByTestId(/^tournament-composer-schedule-fixture-/);
    for (const fixture of fixtures) {
      expect(fixture.textContent).not.toMatch(/\b10:00\b/);
    }
  });

  it("K — multiple fixtures in one round", () => {
    const { draft, preview } = buildPreview();
    render(
      <ComposerSchedulePreviewPresentation
        payload={draft}
        timelineItems={preview.timelineItems}
        summaryLine={null}
        tenantClubName="Test Club"
        tenantLogoUrl="https://example.com/tenant.png"
      />,
    );
    const round1 = screen.getByTestId("tournament-composer-schedule-round-1");
    expect(within(round1).getAllByTestId(/^tournament-composer-schedule-fixture-/).length).toBeGreaterThanOrEqual(2);
  });

  it("L — long team names stay within stacked identity regions", () => {
    const longA = "FC Allschwil Junioren F1 Langname Nord";
    const longB = "FC Allschwil Junioren F2 Langname Süd";
    render(
      <SceTournamentSpielplanPreviewFixtureCard
        fixtureKey="long"
        pitchLabel="Feld 1"
        playersPerSide={null}
        sideA={side(longA, null)}
        sideB={side(longB, null)}
      />,
    );
    const card = screen.getByTestId("tournament-composer-schedule-fixture-long");
    expect(within(card).getByText(longA)).toBeInTheDocument();
    expect(within(card).getByText(longB)).toBeInTheDocument();
    expect(card.querySelector('[data-sce-match-region="home-name"]')).toHaveClass("line-clamp-2");
    expect(card.querySelector('[data-sce-match-region="away-name"]')).toHaveClass("line-clamp-2");
  });

  it("M/N — R11 pause ordering and distinct break presentation", () => {
    const { draft, preview } = buildPreview({
      breaks: [{ afterRoundNumber: 3, durationMinutes: 10 }],
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
      const r4 = preview.timelineItems.find((i) => i.kind === "ROUND" && i.roundNumber === 4);
      expect(r4?.kind).toBe("ROUND");
      if (r4?.kind === "ROUND") {
        expect(r4.roundStartLabel).toBe("10:55");
      }
    }

    render(
      <ComposerSchedulePreviewPresentation
        payload={draft}
        timelineItems={preview.timelineItems}
        summaryLine={null}
        tenantClubName="Test Club"
        tenantLogoUrl="https://example.com/tenant.png"
      />,
    );
    expect(screen.getAllByTestId("tournament-composer-schedule-break")).toHaveLength(1);
    expect(screen.getAllByTestId("sce-tournament-fixture-compact-matchup").length).toBeGreaterThan(0);
    for (const br of screen.getAllByTestId("tournament-composer-schedule-break")) {
      expect(br.querySelector('[data-sce-match-region="fixture"]')).toBeNull();
    }
  });

  it("O — R8 FCA E proposal pipeline", () => {
    const juniorCode = resolveAuthoritativeTeamJuniorCategoryCode({
      ageGroup: null,
      shortName: "Juniori E1",
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

  it("P/Q — Spielplan toggle default off and tournament without Spielplan valid", () => {
    const draft = createEmptyTournamentComposerDraft();
    expect(resolveComposerSpielplanCreationEnabled(draft)).toBe(false);
    draft.spielplanCreationEnabled = false;
    expect(draft.planner).toBeFalsy();
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toMatch(/spielplanCreationEnabled/);
  });

  it("spielplan layout uses management crest density", () => {
    render(
      <SceTournamentSpielplanPreviewFixtureCard
        fixtureKey="crest"
        pitchLabel="Feld 1"
        playersPerSide={3}
        sideA={side("A", "https://example.com/a.png")}
        sideB={side("B", "https://example.com/b.png")}
      />,
    );
    const matchup = screen.getByTestId("sce-tournament-fixture-compact-matchup");
    expect(matchup).toHaveAttribute("data-layout", "spielplan");
    expect(matchup.querySelectorAll('[data-sce-match-region="home-crest"]').length).toBe(1);
    expect(matchup.querySelector('[data-fixture-crest-size="micro"]')).toBeNull();
  });
});
