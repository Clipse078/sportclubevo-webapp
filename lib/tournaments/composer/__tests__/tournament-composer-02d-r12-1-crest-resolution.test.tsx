/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { reconcileComposerPlannerForParticipants } from "../tournament-composer-programme-template";
import { buildTournamentSchedulePreview } from "../tournament-composer-schedule-preview";
import ComposerSchedulePreviewPresentation from "@/components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation";
import { buildComposerParticipantFixtureSidePresentation } from "@/lib/tournaments/tournament-participant-presentation";
import SceTournamentSpielplanPreviewFixtureCard from "@/components/sce/tournament/SceTournamentSpielplanPreviewFixtureCard";
import { participantIdentityFromPlanung } from "@/components/sce/tournament/planung-participant-identity";
import { resolveClubIdentityEffectiveLogoUrl } from "@/lib/sporting-activity-design/club-identity";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const TENANT_CLUB = "FC Allschwil";
const TENANT_LOGO = "/images/logos/fc-allschwil.png";
const EXTERNAL_LOGO = "https://cdn.example.com/external-crest.png";

function buildFourTeamPreviewDraft() {
  const planner = reconcileComposerPlannerForParticipants({
    planner: createDefaultTournamentComposerPlannerDraft(),
    participantCount: 4,
    categoryContext: "E_FF12",
  });
  planner.timing.matchDurationMinutes = 10;
  planner.timing.transitionMinutes = 5;

  const draft = createEmptyTournamentComposerDraft();
  draft.homeAway = "HOME";
  draft.spielplanCreationEnabled = true;
  draft.startAt = "2026-06-01T10:00";
  draft.endAt = "2026-06-01T13:00";
  draft.planner = planner;
  draft.participants = [
    {
      localId: "p0",
      kind: "TEAM",
      teamId: "fca-f1",
      displayName: "FC Allschwil Junioren F1",
      subLabel: TENANT_CLUB,
      dressingRooms: [],
    },
    {
      localId: "p1",
      kind: "TEAM",
      teamId: "fca-f2",
      displayName: "FC Allschwil Junioren F2",
      subLabel: TENANT_CLUB,
      dressingRooms: [],
    },
    {
      localId: "p2",
      kind: "EXTERNAL_CLUB",
      externalClubId: "ext-therwil",
      displayName: "FC Therwil",
      subLabel: null,
      externalClubLogoUrl: EXTERNAL_LOGO,
      dressingRooms: [],
    },
    {
      localId: "p3",
      kind: "MANUAL",
      manualLabel: "Gast Nord",
      displayName: "Gast Nord",
      subLabel: "Manuell",
      dressingRooms: [],
    },
  ];
  return draft;
}

describe("SCE-TOURNAMENT-PLANNER-02D R12.1 — crest resolution & normalisation", () => {
  it("A/B — internal tenant team resolves tenant crest (not initials) in composer preview", () => {
    const draft = buildFourTeamPreviewDraft();
    const preview = buildTournamentSchedulePreview({ payload: draft, categoryContext: "E_FF12" });
    expect(preview.status).toBe("OK");

    render(
      <ComposerSchedulePreviewPresentation
        payload={draft}
        timelineItems={preview.timelineItems}
        summaryLine={null}
        tenantClubName={TENANT_CLUB}
        tenantLogoUrl={TENANT_LOGO}
      />,
    );

    const fixture = screen
      .getAllByTestId(/^tournament-composer-schedule-fixture-/)
      .find((node) => node.textContent?.includes("FC Allschwil Junioren F1"));
    expect(fixture).toBeTruthy();
    const scope = within(fixture!);
    const images = scope.getAllByTestId("club-crest-image");
    expect(images.some((img) => img.getAttribute("src") === TENANT_LOGO)).toBe(true);
    expect(scope.queryByText("FAJ")).toBeNull();
  });

  it("C — external club participant resolves authoritative external crest URL", () => {
    const side = buildComposerParticipantFixtureSidePresentation({
      participants: buildFourTeamPreviewDraft().participants,
      participantLocalId: "p2",
      tenantClubName: TENANT_CLUB,
      tenantLogoUrl: TENANT_LOGO,
    });
    expect(side.crestUrl).toBe(EXTERNAL_LOGO);
  });

  it("D — manual participant without crest keeps canonical fallback path", () => {
    const side = buildComposerParticipantFixtureSidePresentation({
      participants: buildFourTeamPreviewDraft().participants,
      participantLocalId: "p3",
      tenantClubName: TENANT_CLUB,
      tenantLogoUrl: TENANT_LOGO,
    });
    expect(side.crestUrl).toBeNull();
    expect(side.isPlaceholder).toBe(true);
    const identity = participantIdentityFromPlanung(side);
    expect(resolveClubIdentityEffectiveLogoUrl(identity)).toBeNull();
  });

  it("E — no club-name-specific hard-coded resolver in composer preview path", () => {
    const presentation = read(
      "components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation.tsx",
    );
    expect(presentation).toContain("buildComposerParticipantFixtureSidePresentation");
    expect(presentation).not.toMatch(/FC Allschwil|allschwil|FAJ/i);
    expect(read("lib/tournaments/tournament-participant-presentation.ts")).not.toMatch(
      /FC Allschwil|allschwil/i,
    );
  });

  it("F — spielplan fixture crest images use object-contain semantics", () => {
    render(
      <SceTournamentSpielplanPreviewFixtureCard
        fixtureKey="ratio"
        pitchLabel="Feld 1"
        playersPerSide={3}
        sideA={buildComposerParticipantFixtureSidePresentation({
          participants: buildFourTeamPreviewDraft().participants,
          participantLocalId: "p0",
          tenantClubName: TENANT_CLUB,
          tenantLogoUrl: TENANT_LOGO,
        })}
        sideB={buildComposerParticipantFixtureSidePresentation({
          participants: buildFourTeamPreviewDraft().participants,
          participantLocalId: "p2",
          tenantClubName: TENANT_CLUB,
          tenantLogoUrl: TENANT_LOGO,
        })}
      />,
    );
    const img = screen.getAllByTestId("club-crest-image")[0]!;
    expect(img.className).toContain("object-contain");
    expect(img.className).not.toContain("rounded-full");
  });

  it("G — composer preview uses shared tournament participant identity builder", () => {
    expect(
      read("components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation.tsx"),
    ).toMatch(/buildComposerParticipantFixtureSidePresentation/);
  });

  it("H — home and away crest regions share canonical management density", () => {
    render(
      <SceTournamentSpielplanPreviewFixtureCard
        fixtureKey="symmetry"
        pitchLabel="Feld 1"
        playersPerSide={null}
        sideA={buildComposerParticipantFixtureSidePresentation({
          participants: buildFourTeamPreviewDraft().participants,
          participantLocalId: "p0",
          tenantClubName: TENANT_CLUB,
          tenantLogoUrl: TENANT_LOGO,
        })}
        sideB={buildComposerParticipantFixtureSidePresentation({
          participants: buildFourTeamPreviewDraft().participants,
          participantLocalId: "p2",
          tenantClubName: TENANT_CLUB,
          tenantLogoUrl: TENANT_LOGO,
        })}
      />,
    );
    const matchup = screen.getByTestId("sce-tournament-fixture-compact-matchup");
    const homeCrest = matchup.querySelector('[data-sce-match-region="home-crest"] img');
    const awayCrest = matchup.querySelector('[data-sce-match-region="away-crest"] img');
    expect(homeCrest?.className).toContain("object-contain");
    expect(awayCrest?.className).toContain("object-contain");
    expect(matchup.querySelector('[data-fixture-crest-size="micro"]')).toBeNull();
  });
});
