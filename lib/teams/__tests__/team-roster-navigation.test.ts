import { describe, expect, it } from "vitest";
import {
  teamSquadOnboardingHref,
  teamTrainerOnboardingHref,
} from "../team-roster-navigation";

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B-R3 team roster navigation", () => {
  it("squad CTA targets dedicated Kader route with anchor", () => {
    expect(teamSquadOnboardingHref("team-abc")).toBe(
      "/dashboard/teams/team-abc/kader#spielerkader",
    );
  });

  it("trainer CTA targets dedicated Trainerteam route with anchor", () => {
    expect(teamTrainerOnboardingHref("team-abc")).toBe(
      "/dashboard/teams/team-abc/trainerteam#trainerteam",
    );
  });
});
