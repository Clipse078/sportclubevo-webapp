import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("initiative connected work", () => {
  it("exports loader for initiative detail overview", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/club-development/initiative-connected-work.ts"),
      "utf8",
    );
    expect(src).toContain("loadInitiativeConnectedWork");
    expect(src).toContain("agendaLinks");
    expect(src).toContain("MEETING_DECISION");
  });
});
