import { describe, expect, it } from "vitest";
import { getMatchSquadRowProvenanceLabel } from "../match-squad-provenance-presentation";

describe("match-squad-provenance-presentation", () => {
  it("hides normal PLAYER and PARENT provenance in trainer overview rows", () => {
    expect(getMatchSquadRowProvenanceLabel("PLAYER")).toBeNull();
    expect(getMatchSquadRowProvenanceLabel("PARENT")).toBeNull();
    expect(getMatchSquadRowProvenanceLabel(null)).toBeNull();
  });

  it("shows exceptional proxy sources only", () => {
    expect(getMatchSquadRowProvenanceLabel("TRAINER")).toBe("Vom Trainer eingetragen");
    expect(getMatchSquadRowProvenanceLabel("STAFF")).toBe("Vom Staff eingetragen");
  });
});
