import { describe, expect, it } from "vitest";
import { VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS } from "../vereinsentwicklung-connected-task-table";

describe("Vereinsentwicklung connected task table", () => {
  it("uses exact Ziel and Strategie column labels without qualifiers", () => {
    expect(VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.ziel).toBe("Ziel");
    expect(VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.strategie).toBe("Strategie");
    const serialized = JSON.stringify(VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS);
    expect(serialized).not.toMatch(/PARENT|parent|Parent/);
    expect(serialized).not.toMatch(/\(/);
  });
});