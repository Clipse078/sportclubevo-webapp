/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveSportingActivityDetailRouteTarget } from "../route-target";
import { formatSportingActivityDetailLocationLines } from "../detail-location";
import { formatSportingActivityDetailScheduleParts } from "../detail-schedule";
import { buildSportingActivityDetailParticipantTeam } from "../participant-team";
import {
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
  buildTrainingActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design";
import { buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design/tournament-organiser-identity";
import type { MatchcenterSide } from "@/lib/matchcenter/types";
import { SportingActivityDetailContent } from "@/components/sporting-activity/detail/SportingActivityDetailContent";
import type { SportingActivityDetail } from "../types";

const fmtCfg = { locale: "de-CH", timezone: "Europe/Zurich" };

describe("SCE-ACTIVITY-DESIGN-01B-R1 — route target", () => {
  it("hides Route öffnen for HOME training with facility labels only", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      clubName: "FC Allschwil",
      facilityName: "Kunstrasen 2",
      pitchResourceName: "Kunstrasen 2 A",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
    });
    expect(resolveSportingActivityDetailRouteTarget(presentation)).toBeNull();
  });

  it("allows away match venue with structured place line", () => {
    const presentation = buildMatchActivityPresentation({
      resourceKey: "event:1",
      title: "Spiel",
      typeLabel: "Spiel",
      tenantClubName: "FC Allschwil",
      location: "Schützenmatte, Basel",
      startAt: new Date("2026-10-03T14:00:00.000Z"),
      homeAway: "AWAY",
      opponentName: "BSC Old Boys",
    });
    const target = resolveSportingActivityDetailRouteTarget(presentation);
    expect(target?.href).toContain("google.com/maps");
    expect(target?.href).toContain(encodeURIComponent("Schützenmatte"));
  });

  it("allows away tournament host + venue pair", () => {
    const presentation = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      organiserName: "FC Arisdorf",
      location: "Gemeindesportplatz",
      tenantClubName: "FC Allschwil",
      startAt: new Date("2026-10-10T07:30:00.000Z"),
      homeAway: "AWAY",
    });
    const target = resolveSportingActivityDetailRouteTarget(presentation);
    expect(target?.href).toContain(encodeURIComponent("FC Arisdorf"));
    expect(target?.href).toContain(encodeURIComponent("Gemeindesportplatz"));
  });
});

describe("SCE-ACTIVITY-DESIGN-01B-R1 — training location", () => {
  it("includes own-club context without fabricating Im Brüel", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      clubName: "FC Allschwil",
      facilityName: "Kunstrasen 2",
      pitchResourceName: "Kunstrasen 2 A",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
    });
    const lines = formatSportingActivityDetailLocationLines(presentation.location, {
      includeHomeClub: true,
    });
    expect(lines).toEqual(["FC Allschwil", "Kunstrasen 2", "Kunstrasen 2 A"]);
    expect(lines).not.toContain("Im Brüel");
  });
});

describe("SCE-ACTIVITY-DESIGN-01B-R1 — schedule grouping", () => {
  it("splits readable date and time lines", () => {
    const parts = formatSportingActivityDetailScheduleParts({
      startAt: new Date("2026-10-05T15:00:00.000Z"),
      endAt: new Date("2026-10-05T16:30:00.000Z"),
      fmtCfg,
    });
    expect(parts.dateLine).toMatch(/Oktober/i);
    expect(parts.dateLine).not.toMatch(/·/);
    expect(parts.timeLine).toMatch(/–/);
  });
});

describe("SCE-ACTIVITY-DESIGN-01B-R1 — participant team", () => {
  it("builds compact club-prefixed team label", () => {
    const row = buildSportingActivityDetailParticipantTeam({
      tenantClubName: "FC Allschwil",
      teamName: "Junioren F2",
    });
    expect(row?.label).toBe("FC Allschwil Junioren F2");
  });
});

function side(overrides: Partial<MatchcenterSide> = {}): MatchcenterSide {
  return {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: null,
    canonicalTeamName: null,
    displayName: "Club",
    resolution: "RESOLVED",
    isOwnTeam: false,
    ...overrides,
  };
}

describe("SCE-ACTIVITY-DESIGN-01B-R1 — match detail contract (FCA fixture)", () => {
  it("renders home left, away right, competition, and no route for home-only pitch", () => {
    const presentation = buildMatchActivityPresentation({
      resourceKey: "event:match-fca",
      title: "BSC Old Boys – FC Allschwil",
      typeLabel: "Spiel",
      teamName: "1. Mannschaft",
      opponentName: "BSC Old Boys",
      homeAway: "AWAY",
      location: "Schützenmatte, Basel",
      competitionLabel: "2. Liga interregional",
      startAt: new Date("2026-10-03T14:00:00.000Z"),
      endAt: new Date("2026-10-03T16:00:00.000Z"),
      tenantClubName: "FC Allschwil",
    });

    const clubPair = buildMatchClubIdentityPair(
      {
        home: side({ displayName: "BSC Old Boys", isOwnTeam: false }),
        away: side({ displayName: "FC Allschwil", isOwnTeam: true }),
      },
      null,
    );

    const detail: SportingActivityDetail = {
      resourceKey: "event:match-fca",
      kind: "MATCH",
      presentation,
      participantTeam: buildSportingActivityDetailParticipantTeam({
        tenantClubName: "FC Allschwil",
        teamName: "1. Mannschaft",
      }),
      routeTarget: resolveSportingActivityDetailRouteTarget(presentation),
      match: { clubPair },
    };

    render(<SportingActivityDetailContent detail={detail} fmtCfg={fmtCfg} />);

    expect(screen.getByText("BSC Old Boys")).toBeTruthy();
    expect(screen.getByText("FC Allschwil")).toBeTruthy();
    expect(screen.getByText("2. Liga interregional")).toBeTruthy();
    expect(screen.getByText("Auswärts")).toBeTruthy();
    expect(screen.getByText("Ort")).toBeTruthy();
    expect(screen.getByText("Schützenmatte, Basel")).toBeTruthy();
    expect(screen.getByTestId("activity-detail-route-link")).toBeTruthy();
    expect(screen.queryByText(/SFV|Veröffentlichung|Quelle/i)).toBeNull();
  });
});

describe("SCE-ACTIVITY-DESIGN-01B-R1 — tournament hero", () => {
  it("shows organiser once and omits misleading Teams count", () => {
    const presentation = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      teamName: "Junioren F2",
      organiserName: "FC Arisdorf",
      location: "Gemeindesportplatz",
      tenantClubName: "FC Allschwil",
      startAt: new Date("2026-10-10T07:30:00.000Z"),
      endAt: new Date("2026-10-10T09:30:00.000Z"),
      homeAway: "AWAY",
    });

    const organiser = buildTournamentOrganiserClubIdentity({
      title: "PlayMore Turnier",
      organizerName: "FC Arisdorf",
      organizerLogoUrl: null,
      organizerExternalClubId: null,
    });

    const detail: SportingActivityDetail = {
      resourceKey: "event:t1",
      kind: "TOURNAMENT",
      presentation,
      participantTeam: buildSportingActivityDetailParticipantTeam({
        tenantClubName: "FC Allschwil",
        teamName: "Junioren F2",
      }),
      routeTarget: resolveSportingActivityDetailRouteTarget(presentation),
      tournament: {
        organiserClubIdentity: organiser,
        tournamentInfo: [{ label: "Spielmodus", value: "Mini" }],
      },
    };

    render(<SportingActivityDetailContent detail={detail} fmtCfg={fmtCfg} />);

    expect(screen.getByRole("heading", { name: "PlayMore Turnier" })).toBeTruthy();
    expect(screen.getAllByText(/FC Arisdorf/).length).toBe(1);
    expect(screen.queryByText("Teams")).toBeNull();
    expect(screen.queryByText("Treffpunkt")).toBeNull();
  });
});

describe("SCE-ACTIVITY-DESIGN-01B-R1 — training detail surface", () => {
  it("shows club context, grouped schedule, and no route link", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      teamName: "Junioren F2",
      clubName: "FC Allschwil",
      facilityName: "Kunstrasen 2",
      pitchResourceName: "Kunstrasen 2 A",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
      endAt: new Date("2026-10-05T16:30:00.000Z"),
    });

    const detail: SportingActivityDetail = {
      resourceKey: "training-session:1",
      kind: "TRAINING",
      presentation,
      participantTeam: buildSportingActivityDetailParticipantTeam({
        tenantClubName: "FC Allschwil",
        teamName: "Junioren F2",
      }),
      routeTarget: null,
    };

    render(<SportingActivityDetailContent detail={detail} fmtCfg={fmtCfg} />);

    expect(screen.getByRole("heading", { name: "Junioren F2 Training" })).toBeTruthy();
    expect(screen.getByText("FC Allschwil")).toBeTruthy();
    expect(screen.getByText("Kunstrasen 2")).toBeTruthy();
    expect(screen.getByTestId("activity-detail-schedule")).toBeTruthy();
    expect(screen.queryByTestId("activity-detail-route-link")).toBeNull();
    expect(screen.queryByText("Meine Teilnahme")).toBeNull();
  });
});
