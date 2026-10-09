import { describe, expect, it } from "vitest";
import { parseTeamsListApiResponse } from "@/lib/teams/parse-teams-list-api-response";

describe("parseTeamsListApiResponse", () => {
  it("parses canonical GET /api/teams array", () => {
    expect(
      parseTeamsListApiResponse([
        {
          id: "t1",
          name: "FC Allschwil Junioren F2",
          isActive: true,
          activeSeason: { displayName: "Junioren F2" },
        },
      ]),
    ).toEqual([{ id: "t1", name: "Junioren F2" }]);
  });

  it("accepts legacy wrapped teams payload", () => {
    expect(
      parseTeamsListApiResponse({
        teams: [{ id: "t2", name: "Vorstand", isActive: true }],
      }),
    ).toEqual([{ id: "t2", name: "Vorstand" }]);
  });

  it("excludes inactive teams", () => {
    expect(
      parseTeamsListApiResponse([
        { id: "a", name: "Active", isActive: true },
        { id: "b", name: "Inactive", isActive: false },
      ]),
    ).toEqual([{ id: "a", name: "Active" }]);
  });

  it("returns empty for error objects", () => {
    expect(parseTeamsListApiResponse({ error: "Forbidden" })).toEqual([]);
  });
});
