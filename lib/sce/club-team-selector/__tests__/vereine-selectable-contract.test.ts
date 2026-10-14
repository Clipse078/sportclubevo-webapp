import { describe, expect, it } from "vitest";
import { listExternalClubs } from "@/lib/club-directory/query-service";
import { projectClubSummaryDtoToSelectable } from "../selectable-projection";

describe("Vereine ↔ selectable clubs contract", () => {
  it("projects the same identity fields as Club Directory list DTOs", async () => {
    const database = {
      externalClub: {
        findMany: async () => [
          {
            id: "club-a",
            tenantId: "tenant-1",
            name: "FC Allschwil",
            shortName: "FCA",
            alternativeName: "Allschwil",
            logoUrl: "/logos/fca.png",
            source: "manual",
            archivedAt: null,
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-02"),
            _count: { externalTeams: 2, providerMappings: 0 },
          },
        ],
        count: async () => 1,
      },
      externalTeam: {
        findMany: async () => [],
        findFirst: async () => null,
      },
    };

    const clubs = await listExternalClubs(database, { tenantId: "tenant-1", limit: 50, skip: 0 });
    const projected = clubs.map(projectClubSummaryDtoToSelectable);

    expect(projected[0]).toMatchObject({
      id: "club-a",
      name: "FC Allschwil",
      shortName: "FCA",
      logoUrl: "/logos/fca.png",
      status: "active",
      teamCount: 2,
    });
  });
});
