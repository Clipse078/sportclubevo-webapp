import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { mapPlayingUnitsPersistenceError } from "../playing-units-route-errors";

describe("mapPlayingUnitsPersistenceError", () => {
  it("maps missing table (P2021) to actionable database load error", () => {
    const err = new Prisma.PrismaClientKnownRequestError("Table does not exist", {
      code: "P2021",
      clientVersion: "test",
    });
    const mapped = mapPlayingUnitsPersistenceError(err, "load");
    expect(mapped?.status).toBe(503);
    expect(mapped?.errorKind).toBe("database");
    expect(mapped?.error).toMatch(/Migration/i);
  });

  it("maps mutation context separately", () => {
    const err = new Prisma.PrismaClientKnownRequestError("Table does not exist", {
      code: "P2021",
      clientVersion: "test",
    });
    const mapped = mapPlayingUnitsPersistenceError(err, "mutation");
    expect(mapped?.error).toMatch(/nicht erstellt/i);
  });
});
