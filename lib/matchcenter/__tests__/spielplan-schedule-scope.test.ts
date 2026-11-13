import { describe, expect, it } from "vitest";
import {
  deriveSpielplanMonthChips,
  deriveSpielplanMonthChipsFromAnchors,
  filterSpielplanungRowsByListMonth,
  mergeMatchcenterMatchesById,
  normalizeSpielplanungListMonthFilter,
  resolveMatchcenterSpielplanScheduleScope,
  resolveMatchcenterSpielplanungQueryWindow,
  toSpielplanungPaginationState,
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

  it("resolveMatchcenterSpielplanScheduleScope uses active season bounds", () => {
    const now = new Date("2026-11-15T12:00:00.000Z");
    const scope = resolveMatchcenterSpielplanScheduleScope({
      now,
      timeZone: "Europe/Zurich",
      season: {
        id: "season-1",
        name: "2026/2027",
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        endDate: new Date("2027-07-31T23:59:59.000Z"),
      },
    });
    expect(scope.seasonId).toBe("season-1");
    expect(scope.source).toBe("season");
    expect(scope.from.getTime()).toBeGreaterThanOrEqual(
      new Date("2026-11-01T00:00:00.000Z").getTime() - 86_400_000,
    );
    expect(scope.to).toEqual(new Date("2027-07-31T23:59:59.000Z"));
  });

  it("resolveMatchcenterSpielplanungQueryWindow derives paginated query from scope", () => {
    const scope = resolveMatchcenterSpielplanScheduleScope({
      scopeFromParam: "2026-11-01",
      scopeToParam: "2027-05-31",
      timeZone: "Europe/Zurich",
    });
    const window = resolveMatchcenterSpielplanungQueryWindow({ scope, skip: 50 });
    expect(window.skip).toBe(50);
    expect(window.enforceMaxWindow).toBe(false);
    expect(window.to.getTime()).toBeGreaterThan(window.from.getTime());
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

  it("derives dynamic month chips from schedule anchors", () => {
    const chips = deriveSpielplanMonthChipsFromAnchors(
      [
        { id: "a", startAt: new Date("2026-11-20T16:00:00.000Z") },
        { id: "b", startAt: new Date("2027-01-10T16:00:00.000Z") },
      ],
      "de-CH",
      "Europe/Zurich",
    );
    expect(chips.map((c) => c.param)).toEqual(["2026-11", "2027-01"]);
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

  it("toSpielplanungPaginationState exposes hasMore from server total", () => {
    const state = toSpielplanungPaginationState({
      total: 240,
      hasMore: true,
      loadedCount: 100,
      limit: 100,
    });
    expect(state.hasMore).toBe(true);
    expect(state.total).toBe(240);
  });
});
