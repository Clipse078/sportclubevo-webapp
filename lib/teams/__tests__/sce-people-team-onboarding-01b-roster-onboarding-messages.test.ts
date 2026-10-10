import { describe, expect, it } from "vitest";
import {
  mapRosterFetchErrorMessage,
  squadMembershipStatusHint,
  trainerMembershipStatusHint,
} from "@/lib/teams/roster-onboarding-messages";

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B roster onboarding messages", () => {
  it("maps duplicate roster errors to actionable German copy", () => {
    expect(
      mapRosterFetchErrorMessage(
        "Diese Person ist diesem Team-Saison-Kader bereits zugewiesen.",
        "fallback",
      ),
    ).toContain("bereits im Kader");
  });

  it("maps player capacity errors without leaking codes", () => {
    const message = mapRosterFetchErrorMessage(
      "Diese Person ist kein aktiver Spieler.",
      "fallback",
    );
    expect(message).toContain("Spieler");
    expect(message).not.toContain("PERSON_NOT_ELIGIBLE");
  });

  it("describes active squad membership", () => {
    expect(squadMembershipStatusHint("ACTIVE")).toContain("bereits im Kader");
  });

  it("describes reactivation for inactive squad membership", () => {
    expect(squadMembershipStatusHint("INACTIVE")).toContain("wieder aktiviert");
  });

  it("describes trainer membership states", () => {
    expect(trainerMembershipStatusHint("ACTIVE")).toContain("Trainerteam");
    expect(trainerMembershipStatusHint("ARCHIVED")).toContain("wieder aktiviert");
  });
});
