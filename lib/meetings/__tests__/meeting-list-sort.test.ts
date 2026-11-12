import { describe, expect, it } from "vitest";
import { sortMeetingsForList } from "@/lib/meetings/meeting-list-sort";

function m(id: string, iso: string) {
  return {
    id,
    slug: id,
    meetingDate: new Date(iso),
  };
}

describe("sortMeetingsForList", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("orders upcoming nearest-first then past most-recent-first", () => {
    const sorted = sortMeetingsForList(
      [
        m("past-old", "2026-01-01T18:00:00.000Z"),
        m("upcoming-far", "2026-12-01T18:00:00.000Z"),
        m("upcoming-soon", "2026-06-20T18:00:00.000Z"),
        m("past-recent", "2026-06-01T18:00:00.000Z"),
      ],
      now,
    );

    expect(sorted.map((x) => x.id)).toEqual([
      "upcoming-soon",
      "upcoming-far",
      "past-recent",
      "past-old",
    ]);
  });
});
