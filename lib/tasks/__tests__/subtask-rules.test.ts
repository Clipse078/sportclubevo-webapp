import { describe, it, expect } from "vitest";
import { TaskStatus } from "@prisma/client";
import {
  computeSubtaskProgress,
  hasActionableSubtasks,
} from "../subtask-rules";

describe("AUFGABEN-01B subtask progress", () => {
  it("excludes CANCELLED from denominator", () => {
    const progress = computeSubtaskProgress([
      { status: TaskStatus.DONE },
      { status: TaskStatus.CANCELLED },
      { status: TaskStatus.OPEN },
    ]);
    expect(progress.totalCount).toBe(2);
    expect(progress.completedCount).toBe(1);
    expect(progress.label).toBe("1 / 2 erledigt");
  });

  it("detects actionable children blocking parent completion", () => {
    expect(
      hasActionableSubtasks([{ status: TaskStatus.DONE }, { status: TaskStatus.OPEN }]),
    ).toBe(true);
    expect(
      hasActionableSubtasks([
        { status: TaskStatus.DONE },
        { status: TaskStatus.CANCELLED },
      ]),
    ).toBe(false);
  });
});
