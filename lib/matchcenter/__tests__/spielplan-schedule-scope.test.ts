import { describe, expect, it } from "vitest";
import {
  deriveSpielplanMonthChips,
  filterSpielplanungRowsByListMonth,
  mergeMatchcenterMatchesById,
  normalizeSpielplanungListMonthFilter,
  resolveMatchcenterSpielplanungQueryWindow,
} from "../spielplan-schedule-scope";
import type { MatchcenterRowViewModel } from "../view-model";
import type { MatchcenterMatchSummary } from "../types";
import { groupSpielplanungRowsByMonth } from "../management-view";

function rowAt(iso: string, id: string): MatchcenterRowViewModel {
  const match = {
    id,
    startAt: new Date(iso),
  } as MatchcenterMatchSummary;
  return { match, assessment: { status: "OPEN", actionCount: 1, teamUnresolved: false } } as MatchcenterRowViewModel;
}

describe("spielplan-schedule-scope", () => {
  it("normalizeSpielplanungListMonthFilter treats absent and alle as null", () => {
    expect(normalizeSpielplanungListMonthFilter(undefined)).toBeNull();
    expect(normalizeSpielplanungListMonthFilter("alle")).toBeNull();
    expect(normalizeSpielplanungListMonthFilter("2026-11")).toBe("2026-11");
    expect(normalizeSpielplanungListMonthFilter("bad")).toBeNull();
  });

  it("resolveMatchcenterSpielplanungQueryWindow spans multiple calendar months", () => {
    const now = new Date("2026-11-15T12:00:00.000Z");
    const window = resolveMatchcenterSpielplanungQueryWindow({
      now,
      timeZone: "Europe/Zurich",
      futureDays: 120,
    });
    expect(window.to.getTime()).toBeGreaterThan(new Date("2027-02-01T00:00:00.000Z").getTime());
    expect(window.from.getTime()).toBeLessThanOrEqual(now.getTime());
  });

  it("filters rows by explicit month without changing fetch semantics", () => {
    const rows = [
      rowAt("2026-11-20T16:00:00.000Z", "nov"),
      rowAt("2027-01-10T16:00:00.000Z", "jan"),
      rowAt("2027-02-03T16:00:00.000Z", "feb"),
    ];
    const filtered = filterSpielplanungRowsByListMonth(rows, "2026-11", "Europe/Zurich");
    expect(filtered.map((r) => r.match.id)).toEqual(["nov"]);
  });

  it("derives dynamic month chips with year when needed", () => {
    const rows = [
      rowAt("2026-11-20T16:00:00.000Z", "a"),
      rowAt("2027-01-10T16:00:00.000Z", "b"),
    ];
    const chips = deriveSpielplanMonthChips(rows, "de-CH", "Europe/Zurich");
    expect(chips.map((c) => c.param)).toEqual(["2026-11", "2027-01"]);
    expect(chips[0]!.label).toMatch(/NOVEMBER.*2026/);
    expect(chips[1]!.label).toMatch(/JANUAR.*2027/);
  });

  it("groups fixtures under month headings with day groups inside", () => {
    const rows = [
      rowAt("2026-11-20T16:00:00.000Z", "a"),
      rowAt("2027-01-10T16:00:00.000Z", "b"),
    ];
    const groups = groupSpielplanungRowsByMonth(rows, "de-CH", "Europe/Zurich");
    expect(groups).toHaveLength(2);
    expect(groups[0]!.monthParam).toBe("2026-11");
    expect(groups[1]!.monthParam).toBe("2027-01");
    expect(groups[0]!.dayGroups).toHaveLength(1);
  });

  it("mergeMatchcenterMatchesById deduplicates by id", () => {
    const a = { id: "1", startAt: new Date("2026-11-01") } as MatchcenterMatchSummary;
    const b = { id: "2", startAt: new Date("2026-11-02") } as MatchcenterMatchSummary;
  const aDup = { ...a, title: "dup" };
    const merged = mergeMatchcenterMatchesById([a, b], [aDup]);
    expect(merged).toHaveLength(2);
    expect(merged[0]!.id).toBe("1");
    expect(merged[0]!.title).toBeUndefined();
  });
});
