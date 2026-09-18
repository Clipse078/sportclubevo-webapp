import { describe, expect, it } from "vitest";
import { parseSfvMatchDateTime } from "@/lib/integrations/sfv/sync/provider-time";
import {
  isKnownKickoffForMatch,
  isLocalMidnightInstant,
  isProviderSyncedUnknownKickoff,
  isSfvPlaceholderKickoffDateTime,
  SCE_UNKNOWN_KICKOFF_TIME_LABEL,
} from "../kickoff-semantics";

describe("kickoff-semantics", () => {
  it("detects SFV raw placeholder matchDate strings", () => {
    expect(isSfvPlaceholderKickoffDateTime("2026-09-19T00:00:00")).toBe(true);
    expect(isSfvPlaceholderKickoffDateTime("2026-09-19T19:45:00")).toBe(false);
  });

  it("FC Arlesheim c fixture: provider midnight → unknown kickoff for SFV", () => {
    const startAt = parseSfvMatchDateTime("2026-09-19T00:00:00");
    expect(startAt.toISOString()).toBe("2026-09-18T22:00:00.000Z");
    expect(isProviderSyncedUnknownKickoff({ startAt, eventSource: "SFV" })).toBe(true);
    expect(isKnownKickoffForMatch({ startAt, eventSource: "SFV" })).toBe(false);
  });

  it("known SFV kickoff 19:45 remains known", () => {
    const startAt = parseSfvMatchDateTime("2026-09-19T19:45:00");
    expect(isProviderSyncedUnknownKickoff({ startAt, eventSource: "SFV" })).toBe(false);
  });

  it("manual midnight kickoff remains representable as 00:00", () => {
    const startAt = parseSfvMatchDateTime("2026-09-19T00:00:00");
    expect(isProviderSyncedUnknownKickoff({ startAt, eventSource: "MANUAL" })).toBe(false);
    expect(isKnownKickoffForMatch({ startAt, eventSource: "MANUAL" })).toBe(true);
    expect(isLocalMidnightInstant(startAt, "Europe/Zurich")).toBe(true);
  });

  it("exports canonical unknown-time label", () => {
    expect(SCE_UNKNOWN_KICKOFF_TIME_LABEL).toBe("Zeit offen");
  });
});
