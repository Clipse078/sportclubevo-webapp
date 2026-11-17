/**
 * Meeting tenant-local datetime contract (MEETING-TIMEZONE-01).
 */

import { describe, expect, it } from "vitest";
import {
  formatMeetingDateTimeLocalValue,
  meetingDateTimeLocalRoundTrips,
  parseMeetingDateTimeInput,
} from "@/lib/meetings/meeting-datetime";

const ZURICH = "Europe/Zurich";

describe("meeting datetime contract", () => {
  it("November 2026: 18:30 tenant-local persists as 17:30Z and displays consistently", () => {
    const local = "2026-11-19T18:30";
    const utc = parseMeetingDateTimeInput(local, ZURICH);
    expect(utc?.toISOString()).toBe("2026-11-19T17:30:00.000Z");
    expect(formatMeetingDateTimeLocalValue(utc, ZURICH)).toBe(local);
    expect(meetingDateTimeLocalRoundTrips(local, utc!, ZURICH)).toBe(true);
  });

  it("summer 2026: 13:30 tenant-local persists as 11:30Z", () => {
    const local = "2026-08-30T13:30";
    const utc = parseMeetingDateTimeInput(local, ZURICH)!;
    expect(utc.toISOString()).toBe("2026-08-30T11:30:00.000Z");
    expect(formatMeetingDateTimeLocalValue(utc, ZURICH)).toBe(local);
  });

  it("unchanged edit round-trip preserves stored instant", () => {
    const stored = new Date("2026-11-19T17:30:00.000Z");
    const input = formatMeetingDateTimeLocalValue(stored, ZURICH);
    const reparsed = parseMeetingDateTimeInput(input, ZURICH)!;
    expect(reparsed.getTime()).toBe(stored.getTime());
  });

  it("rejects the legacy UTC-slice hydration mistake (18:30Z looks like 18:30 in edit but is 19:30 in Zurich)", () => {
    const wronglyStored = new Date("2026-11-19T18:30:00.000Z");
    const legacyEditValue = wronglyStored.toISOString().slice(0, 16);
    expect(legacyEditValue).toBe("2026-11-19T18:30");
    const canonicalEditValue = formatMeetingDateTimeLocalValue(wronglyStored, ZURICH);
    expect(canonicalEditValue).toBe("2026-11-19T19:30");
    expect(legacyEditValue).not.toBe(canonicalEditValue);
  });

  it("documents proposed data correction for vereinsleitungssitzung-november-2026 without DB write", () => {
    const before = { meetingDate: "2026-11-19T18:30:00.000Z" };
    const after = { meetingDate: "2026-11-19T17:30:00.000Z" };
    expect(formatMeetingDateTimeLocalValue(before.meetingDate, ZURICH)).toBe("2026-11-19T19:30");
    expect(formatMeetingDateTimeLocalValue(after.meetingDate, ZURICH)).toBe("2026-11-19T18:30");
    expect(after).not.toEqual(before);
  });

  it("rejects nonexistent spring-forward local times", () => {
    const gap = "2026-03-29T02:30";
    const parsed = parseMeetingDateTimeInput(gap, ZURICH);
    if (parsed) {
      expect(meetingDateTimeLocalRoundTrips(gap, parsed, ZURICH)).toBe(false);
    }
  });

  it("documents autumn DST ambiguity policy without changing accepted round-trips", () => {
    // Europe/Zurich autumn 2026-10-25: 02:00–02:59 local occurs twice (CEST then CET).
    // PO policy (unchanged): parse via zonedTimeToUtc; reject when round-trip label drifts.
    const ambiguous = "2026-10-25T02:30";
    const parsed = parseMeetingDateTimeInput(ambiguous, ZURICH);
    expect(parsed).not.toBeNull();
    if (parsed) {
      const roundTrip = formatMeetingDateTimeLocalValue(parsed, ZURICH);
      const policyAcceptsWallClock =
        roundTrip === ambiguous && meetingDateTimeLocalRoundTrips(ambiguous, parsed, ZURICH);
      expect(policyAcceptsWallClock || roundTrip !== ambiguous).toBe(true);
    }
  });
});