import { describe, expect, it } from "vitest";
import { getParticipationResponseProvenanceLabel } from "../participation-provenance-labels";

describe("participation-provenance-labels", () => {
  it("maps responseSource to canonical Match trainer-facing labels", () => {
    expect(getParticipationResponseProvenanceLabel("PLAYER")).toBe("Vom Spieler");
    expect(getParticipationResponseProvenanceLabel("PARENT")).toBe("Von Eltern bestätigt");
    expect(getParticipationResponseProvenanceLabel("TRAINER")).toBe("Vom Trainer eingetragen");
    expect(getParticipationResponseProvenanceLabel("STAFF")).toBe("Vom Staff eingetragen");
  });

  it("does not invent provenance for missing or OPEN-without-row", () => {
    expect(getParticipationResponseProvenanceLabel(null)).toBeNull();
    expect(getParticipationResponseProvenanceLabel(undefined)).toBeNull();
  });
});
