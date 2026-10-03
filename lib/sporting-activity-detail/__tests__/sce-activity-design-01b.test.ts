import { describe, expect, it } from "vitest";
import {
  buildSportingActivityDetailHref,
  buildSportingActivityDetailHrefFromResourceKey,
  isSportingActivityDetailHref,
} from "../href";
import { resolveSportingActivityDetailRouteTarget } from "../route-target";
import { buildMatchActivityPresentation, buildTournamentActivityPresentation, buildTrainingActivityPresentation } from "@/lib/sporting-activity-presentation/builders";
import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design";
import { buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design/tournament-organiser-identity";
import type { MatchcenterSide } from "@/lib/matchcenter/types";

describe("SCE-ACTIVITY-DESIGN-01B — href contract", () => {
  it("builds training and event detail routes", () => {
    expect(buildSportingActivityDetailHref("TRAINING", "sess-1")).toBe(
      "/dashboard/activity/training-session/sess-1",
    );
    expect(buildSportingActivityDetailHref("MATCH", "ev-1")).toBe(
      "/dashboard/activity/event/ev-1",
    );
    expect(buildSportingActivityDetailHrefFromResourceKey("training-session:abc")).toBe(
      "/dashboard/activity/training-session/abc",
    );
    expect(isSportingActivityDetailHref("/dashboard/activity/event/x")).toBe(true);
    expect(isSportingActivityDetailHref("/dashboard/planner/edit/x")).toBe(false);
  });
});

describe("SCE-ACTIVITY-DESIGN-01B — route target", () => {
  it("does not invent route when location is empty", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Training",
      typeLabel: "Training",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
    });
    expect(resolveSportingActivityDetailRouteTarget(presentation)).toBeNull();
  });

  it("builds maps link from trustworthy away venue lines", () => {
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
    expect(target?.label).toBe("Route öffnen");
    expect(target?.href).toContain("google.com/maps");
    expect(target?.href).toContain(encodeURIComponent("Schützenmatte"));
  });

  it("does not build maps link from HOME facility labels alone", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Training",
      typeLabel: "Training",
      clubName: "FC Allschwil",
      facilityName: "Kunstrasen 2",
      pitchResourceName: "Kunstrasen 2 A",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
    });
    expect(resolveSportingActivityDetailRouteTarget(presentation)).toBeNull();
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

describe("SCE-ACTIVITY-DESIGN-01B — match ordering", () => {
  it("keeps home left and away right regardless of tenant side", () => {
    const pair = buildMatchClubIdentityPair(
      {
        home: side({ displayName: "BSC Old Boys", isOwnTeam: false }),
        away: side({ displayName: "FC Allschwil", isOwnTeam: true }),
      },
      null,
    );
    expect(pair.homeClubIdentity.displayName).toBe("BSC Old Boys");
    expect(pair.awayClubIdentity.displayName).toBe("FC Allschwil");
  });
});

describe("SCE-ACTIVITY-DESIGN-01B — tournament organiser", () => {
  it("uses organiser identity, not participating team", () => {
    const organiser = buildTournamentOrganiserClubIdentity({
      title: "PlayMore Turnier",
      organizerName: "FC Arisdorf",
      organizerLogoUrl: "https://example.com/logo.png",
      organizerExternalClubId: "club-arisdorf",
    });
    expect(organiser.displayName).toBe("FC Arisdorf");

    const presentation = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      teamName: "Junioren F2",
      organiserName: "FC Arisdorf",
      tenantClubName: "FC Allschwil",
      startAt: new Date("2026-10-10T07:30:00.000Z"),
      homeAway: "AWAY",
    });
    expect(presentation.team?.name).toBe("Junioren F2");
    expect(presentation.context?.organiser).toBe("FC Arisdorf");
  });
});

describe("SCE-ACTIVITY-DESIGN-01B — training identity", () => {
  it("uses blue training presentation without fabricated meeting time", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      teamName: "Junioren F2",
      clubName: "FC Allschwil",
      facilityName: "Im Brüel",
      pitchResourceName: "Kunstrasen 2 A",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
      endAt: new Date("2026-10-05T16:30:00.000Z"),
    });
    expect(presentation.identity.activityKind).toBe("TRAINING");
    expect(presentation.schedule.meetingAt).toBeUndefined();
  });
});
