import { describe, expect, it } from "vitest";
import {
  R11_TRAINING_IDENTITY_HORIZONTAL,
  resolveTrainingIdentityLines,
  resolveTrainingIdentityLinesWithClubStack,
} from "@/lib/infoboard/training-identity-display";

describe("R11 training venue identity", () => {
  it("R11_TRAINING_IDENTITY_HORIZONTAL", () => {
    expect(R11_TRAINING_IDENTITY_HORIZONTAL).toBe(true);
  });

  it("prefers team-only primary for tenant-prefixed labels", () => {
    expect(
      resolveTrainingIdentityLines(
        "FC Allschwil Junioren D-7 D1",
        "FC Allschwil",
      ),
    ).toEqual({ primary: "Junioren D-7 D1", secondary: null });
  });

  it("resolveTrainingIdentityLinesWithClubStack keeps club + team when needed", () => {
    expect(
      resolveTrainingIdentityLinesWithClubStack(
        "FC Allschwil Junioren A",
        "FC Allschwil",
      ),
    ).toEqual({ primary: "FC Allschwil", secondary: "Junioren A" });
  });
});
