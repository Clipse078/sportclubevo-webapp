import { describe, expect, it } from "vitest";
import {
  evaluatePlayerBirthYearEligibility,
  resolveTeamBirthYearEligibility,
} from "@/lib/teams/player-birth-year-eligibility";
import {
  formatAllowedBirthYearsLabel,
  presentRosterBirthYearEligibility,
  rosterEligibilityErrorMessage,
} from "@/lib/teams/roster-eligibility-presentation";
import { sanitizeInternalDashboardReturnPath } from "@/lib/navigation/safe-internal-return-path";

const SEASON_START = "2026-07-01T00:00:00.000Z";

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B R4 player birth-year eligibility", () => {
  it("treats Senioren 40+ style age groups as unrestricted (no DOB gate)", () => {
    const result = evaluatePlayerBirthYearEligibility({
      categoryCode: "40+",
      seasonStartDate: SEASON_START,
      birthDate: null,
    });

    expect(result.ok).toBe(true);
    expect(result.kind).toBe("UNRESTRICTED");
  });

  it("blocks missing DOB for junior teams with a real year range", () => {
    const team = resolveTeamBirthYearEligibility({
      categoryCode: "F",
      seasonStartDate: SEASON_START,
    });

    expect(team.mode).toBe("JUNIOR_BIRTH_YEAR");
    expect(team.allowedBirthYears.length).toBeGreaterThan(0);

    const result = evaluatePlayerBirthYearEligibility({
      categoryCode: "F",
      seasonStartDate: SEASON_START,
      birthDate: null,
    });

    expect(result.ok).toBe(false);
    expect(result.kind).toBe("MISSING_PERSON_DOB");
  });

  it("accepts DOB inside junior range", () => {
    const team = resolveTeamBirthYearEligibility({
      categoryCode: "F",
      seasonStartDate: SEASON_START,
    });

    const birthYear = team.allowedBirthYears[0];
    const result = evaluatePlayerBirthYearEligibility({
      categoryCode: "F",
      seasonStartDate: SEASON_START,
      birthDate: `${birthYear}-05-10T00:00:00.000Z`,
    });

    expect(result.ok).toBe(true);
    expect(result.kind).toBe("ELIGIBLE");
  });

  it("rejects DOB outside junior range", () => {
    const result = evaluatePlayerBirthYearEligibility({
      categoryCode: "F",
      seasonStartDate: SEASON_START,
      birthDate: "2014-01-01T00:00:00.000Z",
    });

    expect(result.ok).toBe(false);
    expect(result.kind).toBe("BIRTH_YEAR_OUTSIDE_RANGE");
  });

  it("flags malformed junior labels as incomplete team configuration", () => {
    const team = resolveTeamBirthYearEligibility({
      categoryCode: "F2",
      seasonStartDate: SEASON_START,
    });

    expect(team.mode).toBe("CONFIG_INCOMPLETE");

    const result = evaluatePlayerBirthYearEligibility({
      categoryCode: "F2",
      seasonStartDate: SEASON_START,
      birthDate: "2017-01-01T00:00:00.000Z",
    });

    expect(result.kind).toBe("TEAM_CONFIG_INCOMPLETE");
  });

  it("never renders empty allowed-year labels in presentation", () => {
    const missingDob = presentRosterBirthYearEligibility({
      kind: "MISSING_PERSON_DOB",
      allowedBirthYears: [2016, 2017],
      birthYear: null,
      personId: "person-1",
      canEditPerson: true,
      returnTo: "/dashboard/teams/team-1/kader",
    });

    expect(missingDob?.allowedBirthYearsLabel).toBe("2016–2017");
    expect(formatAllowedBirthYearsLabel([])).toBeNull();

    const unrestrictedMessage = rosterEligibilityErrorMessage({
      kind: "UNRESTRICTED",
      allowedBirthYears: [],
      birthYear: null,
    });
    expect(unrestrictedMessage).not.toContain("Erlaubte Jahrgänge: .");
    expect(unrestrictedMessage).not.toContain("Erlaubte Jahrgänge:");
  });

  it("shows person edit CTA only when actor can manage people", () => {
    const allowed = presentRosterBirthYearEligibility({
      kind: "MISSING_PERSON_DOB",
      allowedBirthYears: [2016, 2017],
      birthYear: null,
      personId: "person-1",
      canEditPerson: true,
      returnTo: "/dashboard/teams/team-1/kader",
    });

    const denied = presentRosterBirthYearEligibility({
      kind: "MISSING_PERSON_DOB",
      allowedBirthYears: [2016, 2017],
      birthYear: null,
      personId: "person-1",
      canEditPerson: false,
    });

    expect(allowed?.showPersonBirthDateCta).toBe(true);
    expect(allowed?.personEditHref).toContain("returnTo=");
    expect(denied?.showPersonBirthDateCta).toBe(false);
    expect(denied?.personEditHref).toBeNull();
  });

  it("sanitizes return navigation paths", () => {
    expect(
      sanitizeInternalDashboardReturnPath("/dashboard/teams/abc/kader"),
    ).toBe("/dashboard/teams/abc/kader");
    expect(sanitizeInternalDashboardReturnPath("https://evil.example")).toBeNull();
    expect(sanitizeInternalDashboardReturnPath("/dashboard/../admin")).toBeNull();
  });
});
