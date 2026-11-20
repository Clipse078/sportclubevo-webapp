import { describe, expect, it } from "vitest";
import { buildPersonNameSearchOrClauses } from "../person-name-search";

describe("buildPersonNameSearchOrClauses", () => {
  it("includes first, last, and full-name AND clauses", () => {
    const clauses = buildPersonNameSearchOrClauses("Michael Duijster");
    expect(clauses.length).toBeGreaterThanOrEqual(3);
    const andClause = clauses.find(
      (row) => typeof row === "object" && row !== null && "AND" in row,
    );
    expect(andClause).toBeDefined();
  });

  it("returns empty for whitespace-only input", () => {
    expect(buildPersonNameSearchOrClauses("   ")).toEqual([]);
  });
});