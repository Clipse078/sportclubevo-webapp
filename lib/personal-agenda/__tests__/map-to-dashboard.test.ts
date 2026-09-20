import { describe, expect, it } from "vitest";
import { TaskStatus } from "@prisma/client";
import { mapPersonalCalendarItemsToAgendaItems } from "../map-to-dashboard";
import type { PersonalCalendarItem } from "../types";

describe("AUFGABEN-04A — dashboard task deadline presentation", () => {
  const fmtCfg = {
    locale: "de-CH",
    timezone: "Europe/Zurich",
    timeFormat: "24h" as const,
  };

  it("does not show noon-UTC anchor as a clock appointment time", () => {
    const dueAt = new Date("2026-09-27T12:00:00.000Z");
    const items: PersonalCalendarItem[] = [
      {
        id: "task:t1",
        sourceType: "TASK",
        title: "Material bestellen",
        startAt: dueAt,
        allDay: true,
        href: "/dashboard/aufgaben/t1",
        typeLabel: "Aufgabe",
        taskStatus: TaskStatus.OPEN,
        ariaLabel: "Aufgabe: Material bestellen",
      },
    ];

    const agenda = mapPersonalCalendarItemsToAgendaItems({
      items,
      fmtCfg,
      timeZone: "Europe/Zurich",
      now: new Date("2026-09-26T10:00:00.000Z"),
    });

    expect(agenda).toHaveLength(1);
    expect(agenda[0]?.timeLabel).toBe("Morgen");
    expect(agenda[0]?.timeLabel).not.toMatch(/^\d{1,2}:\d{2}$/);
  });
});
