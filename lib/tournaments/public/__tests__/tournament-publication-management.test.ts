import { describe, expect, it } from "vitest";
import { resolveTournamentPublicationManagement } from "../tournament-publication-management";

describe("resolveTournamentPublicationManagement", () => {
  it("allows HOME tenant-organised tournaments", () => {
    expect(
      resolveTournamentPublicationManagement({
        homeAway: "HOME",
        organizerName: "FC Allschwil",
        tenantName: "FC Allschwil",
      }),
    ).toMatchObject({ allowed: true, ownership: "TENANT_ORGANISED" });
  });

  it("rejects AWAY tournaments", () => {
    expect(
      resolveTournamentPublicationManagement({
        homeAway: "AWAY",
        organizerName: "External Club",
        tenantName: "FC Allschwil",
      }),
    ).toMatchObject({ allowed: false, ownership: "EXTERNALLY_ORGANISED" });
  });

  it("fail-closed on unknown ownership", () => {
    expect(
      resolveTournamentPublicationManagement({
        homeAway: null,
        organizerName: null,
        tenantName: "FC Allschwil",
      }),
    ).toMatchObject({ allowed: false, ownership: "UNKNOWN" });
  });
});
