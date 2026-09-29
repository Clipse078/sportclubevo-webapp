import { describe, expect, it } from "vitest";
import {
  mergeSceSelectorResultGroups,
  sceSelectorPageFromFetched,
} from "@/lib/sce/list-selector/source-pagination";

describe("source-pagination", () => {
  it("computes hasMore and nextCursor from limit+1 fetch", () => {
    const page = sceSelectorPageFromFetched(
      [
        { id: "1", type: "TEAM", label: "A" },
        { id: "2", type: "TEAM", label: "B" },
        { id: "3", type: "TEAM", label: "C" },
      ],
      2,
      0,
    );
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("2");
  });

  it("merges groups without duplicate item ids", () => {
    const merged = mergeSceSelectorResultGroups(
      [
        {
          type: "TEAM",
          heading: "Teams",
          items: [{ id: "t1", type: "TEAM", label: "One" }],
          hasMore: true,
          nextCursor: "1",
        },
      ],
      [
        {
          type: "TEAM",
          heading: "Teams",
          items: [
            { id: "t1", type: "TEAM", label: "One" },
            { id: "t2", type: "TEAM", label: "Two" },
          ],
          hasMore: false,
          nextCursor: null,
        },
      ],
    );
    expect(merged[0]?.items).toHaveLength(2);
    expect(merged[0]?.hasMore).toBe(false);
  });
});
