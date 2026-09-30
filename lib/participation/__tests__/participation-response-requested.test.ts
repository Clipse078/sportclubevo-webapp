import { describe, expect, it } from "vitest";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";

describe("isParticipationResponseRequested", () => {
  it("is false when due date is null or undefined", () => {
    expect(isParticipationResponseRequested({ participationResponseDueAt: null })).toBe(false);
    expect(isParticipationResponseRequested({ participationResponseDueAt: undefined })).toBe(false);
  });

  it("is true when due date is set", () => {
    expect(
      isParticipationResponseRequested({
        participationResponseDueAt: new Date("2026-10-01T12:00:00.000Z"),
      }),
    ).toBe(true);
  });
});
