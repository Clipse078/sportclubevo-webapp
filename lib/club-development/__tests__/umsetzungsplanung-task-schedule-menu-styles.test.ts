import { describe, expect, it } from "vitest";
import {
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_PHASE_ITEM_CLASS,
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_POPOVER_CLASS,
} from "../umsetzungsplanung-task-schedule-menu-styles";

describe("umsetzungsplanung task schedule menu portal styles", () => {
  it("uses SCE overflow menu surface and item focus/hover tokens", () => {
    expect(UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_POPOVER_CLASS).toContain("bg-[var(--surface)]");
    expect(UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_POPOVER_CLASS).toContain("shadow-[var(--shadow-lg)]");
    expect(UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_PHASE_ITEM_CLASS).toContain("hover:bg-[var(--surface-2)]");
    expect(UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_PHASE_ITEM_CLASS).toContain("text-[var(--foreground)]");
  });
});