import { describe, expect, it } from "vitest";
import { buildTournamentCenterHref, resolveTournamentTimeScopeFromParams } from "../navigation";

describe("resolveTournamentTimeScopeFromParams", () => {
  it("maps legacy archiv tab to PAST", () => {
    expect(resolveTournamentTimeScopeFromParams({ tab: "archiv" })).toBe("PAST");
  });

  it("prefers explicit scope", () => {
    expect(resolveTournamentTimeScopeFromParams({ scope: "all", tab: "archiv" })).toBe("ALL");
  });
});

describe("buildTournamentCenterHref", () => {
  it("omits default upcoming scope and date grouping", () => {
    expect(buildTournamentCenterHref("/dashboard/tournamentcenter", { scope: "UPCOMING" })).toBe(
      "/dashboard/tournamentcenter",
    );
  });

  it("serializes active filters", () => {
    const href = buildTournamentCenterHref("/dashboard/tournamentcenter", {
      scope: "PAST",
      search: "hallen",
      teamFilter: "team-1",
      month: "2026-09",
      statusFilter: "SCHEDULED",
      group: "TEAM",
      sort: "TITLE",
    });

    expect(href).toContain("scope=past");
    expect(href).toContain("q=hallen");
    expect(href).toContain("team=team-1");
    expect(href).toContain("month=2026-09");
    expect(href).toContain("status=scheduled");
    expect(href).toContain("group=team");
    expect(href).toContain("sort=title");
  });
});
