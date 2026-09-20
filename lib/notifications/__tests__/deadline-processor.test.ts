import { describe, expect, it } from "vitest";
import { selectDeadlineProcessingPageIndex } from "../deadline-processor";

describe("deadline processor batch rotation", () => {
  it("rotates tenant/task pages hourly without sticking on page zero", () => {
    const now = new Date("2026-09-21T13:00:00.000Z");
    expect(selectDeadlineProcessingPageIndex(now, 1)).toBe(0);
    expect(selectDeadlineProcessingPageIndex(now, 4)).toBe(13 % 4);
    const later = new Date("2026-09-21T14:00:00.000Z");
    expect(selectDeadlineProcessingPageIndex(later, 4)).toBe(14 % 4);
    expect(selectDeadlineProcessingPageIndex(later, 4)).not.toBe(
      selectDeadlineProcessingPageIndex(now, 4),
    );
  });
});
