import { describe, expect, it } from "vitest";
import { resolveMatchComposerPersistedLocation } from "@/lib/matchcenter/match-create-validation";
import { createEmptyMatchComposerDraft } from "@/lib/matchcenter/composer/match-composer-draft-types";

describe("Match location integrity — AWAY provider strings", () => {
  it("does not strip provider pitch suffix", () => {
    const payload = {
      ...createEmptyMatchComposerDraft(),
      homeAway: "AWAY" as const,
      location: "SV Sissach · Sportzentrum Tannenbrunn, Sissach - 2",
    };
    expect(resolveMatchComposerPersistedLocation(payload)).toBe(payload.location);
  });

  it("does not trim internal spacing", () => {
    const payload = {
      ...createEmptyMatchComposerDraft(),
      homeAway: "AWAY" as const,
      location: "  A · B, Ort - 2  ",
    };
    expect(resolveMatchComposerPersistedLocation(payload)).toBe("A · B, Ort - 2");
  });
});
