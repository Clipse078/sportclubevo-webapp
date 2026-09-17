import { describe, expect, it } from "vitest";
import { getPublishingEffectiveEndAt } from "../publishing-effective-end-at";
import { SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES } from "@/lib/match/defaults";

describe("getPublishingEffectiveEndAt", () => {
  const start = new Date("2026-09-19T05:30:00.000Z");

  it("uses explicit meaningful endAt for MATCH without calling platform fallback", () => {
    const end = new Date("2026-09-19T07:30:00.000Z");
    const result = getPublishingEffectiveEndAt(
      { startAt: start, endAt: end, type: "MATCH" },
      undefined,
    );
    expect(result).toEqual(end);
  });

  it("uses SCE platform fallback (120 min) for MATCH with null endAt and no policy row", () => {
    const result = getPublishingEffectiveEndAt(
      { startAt: start, endAt: null, type: "MATCH", authoritativeEndAt: null },
      { matchOperationalPolicy: { defaultMatchDurationMinutes: 120, isClubConfigured: false } },
    );
    expect(result.getTime()).toBe(
      start.getTime() + SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES * 60_000,
    );
  });

  it("uses club default minutes from tenant policy for MATCH without explicit end", () => {
    const result = getPublishingEffectiveEndAt(
      { startAt: start, endAt: null, type: "MATCH", authoritativeEndAt: null },
      { matchOperationalPolicy: { defaultMatchDurationMinutes: 105, isClubConfigured: true } },
    );
    expect(result.getTime()).toBe(start.getTime() + 105 * 60_000);
  });

  it("honours operationalEndAtOverride for MATCH", () => {
    const overrideEnd = new Date("2026-09-19T07:00:00.000Z");
    const result = getPublishingEffectiveEndAt(
      {
        startAt: start,
        endAt: null,
        type: "MATCH",
        authoritativeEndAt: null,
        operationalEndAtOverride: overrideEnd,
      },
      { matchOperationalPolicy: { defaultMatchDurationMinutes: 120, isClubConfigured: false } },
    );
    expect(result).toEqual(overrideEnd);
  });
});
