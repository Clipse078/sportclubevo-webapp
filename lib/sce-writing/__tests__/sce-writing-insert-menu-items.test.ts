import { describe, expect, it } from "vitest";

import { listSceWritingInsertMenuItems } from "@/lib/sce-writing/sce-writing-insert-menu-items";

describe("sce-writing insert menu items", () => {
  it("filters by profile", () => {
    const task = listSceWritingInsertMenuItems("task");
    const doc = listSceWritingInsertMenuItems("documentation");
    expect(task.some((item) => item.id === "task-list")).toBe(true);
    expect(task.some((item) => item.id === "heading-2")).toBe(false);
    expect(doc.some((item) => item.id === "heading-2")).toBe(true);
    expect(doc.some((item) => item.id === "task-list")).toBe(false);
  });

  it("filters by query", () => {
    const matches = listSceWritingInsertMenuItems("task", "check");
    expect(matches.every((item) => item.profiles.includes("task"))).toBe(true);
    expect(matches.some((item) => item.id === "task-list")).toBe(true);
  });
});