import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { mapPlayerReleaseRouteError } from "@/lib/match-squad/player-release-route-access";

describe("mapPlayerReleaseRouteError", () => {
  it("returns structured JSON when PlayerRelease table is missing (P2021)", async () => {
    const response = mapPlayerReleaseRouteError(
      new Prisma.PrismaClientKnownRequestError("Table does not exist", {
        code: "P2021",
        clientVersion: "test",
      }),
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("SCHEMA_NOT_READY");
    expect(typeof body.error).toBe("string");
    expect(body.error).toContain("Spielerfreigabe-Schema");
  });

  it("returns structured JSON for unexpected failures", async () => {
    const response = mapPlayerReleaseRouteError(new Error("boom"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Spielerfreigabe konnte nicht verarbeitet werden.",
      code: "INTERNAL",
    });
  });
});
