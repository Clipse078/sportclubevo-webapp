import { describe, expect, it } from "vitest";
import { manualMoveTargetAllowed, resolveManualMoveCapabilities } from "../manual-move-capabilities";

describe("01I manual move capabilities", () => {
  it("B — full lock disables drag", () => {
    expect(resolveManualMoveCapabilities("TIME_AND_PITCH").canDrag).toBe(false);
  });

  it("C — dimensional lock restricts allowed move dimension", () => {
    expect(
      manualMoveTargetAllowed({
        lockDimension: "TIME",
        fromPitchId: "a",
        fromStartUtc: "t1",
        toPitchId: "b",
        toStartUtc: "t1",
      }),
    ).toBe(true);
    expect(
      manualMoveTargetAllowed({
        lockDimension: "TIME",
        fromPitchId: "a",
        fromStartUtc: "t1",
        toPitchId: "a",
        toStartUtc: "t2",
      }),
    ).toBe(false);
  });
});
