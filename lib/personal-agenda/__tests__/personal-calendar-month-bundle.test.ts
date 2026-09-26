import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolvePersonalProgrammeMonthGridRange } from "../programme-month-range";
import { parsePersonalKalenderUrlState } from "../kalender-url";
import {
  normalizePersonalProgrammeItem,
  normalizePersonalTaskCalendarItem,
  parseCalendarResourceIdentity,
} from "../normalize-calendar-item";
import { sortNormalizedCalendarItems } from "../calendar-item-sort";
import { normalizedCalendarItemDayKey } from "../calendar-item-day-key";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import type { PersonalCalendarItem } from "../types";
import { buildTaskProjectionId } from "../types";

vi.mock("../load-personal-programme", () => ({
  loadPersonalProgramme: vi.fn(),
}));

vi.mock("../task-projections", () => ({
  loadTaskDeadlineProjections: vi.fn(),
}));

import { loadPersonalProgramme } from "../load-personal-programme";
import { loadTaskDeadlineProjections } from "../task-projections";
import { loadPersonalCalendarMonthBundle } from "../load-personal-calendar-month-bundle";

const TIME_ZONE = "Pacific/Kiritimati"; // UTC+14 — strong server/tenant month split

function programmeFixture(
  overrides: Partial<PersonalProgrammeItem> & Pick<PersonalProgrammeItem, "id" | "sourceType">,
): PersonalProgrammeItem {
  return {
    startsAt: new Date("2026-09-10T10:00:00.000Z"),
    title: "Fixture",
    deepLink: "/dashboard/planner/edit/ev-1",
    typeLabel: "Spiel",
    ariaLabel: "Fixture",
    ...overrides,
  };
}

describe("SCE-CALENDAR-UX-02 — normalized personal calendar month bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("identity", () => {
    it("keeps distinct ids across semantic types for the same raw uuid", () => {
      const uuid = "same-uuid";
      const training = normalizePersonalProgrammeItem(
        programmeFixture({
          id: `training-session:${uuid}`,
          sourceType: "TRAINING",
          deepLink: `/dashboard/training/sessions/${uuid}/edit`,
        }),
      );
      const match = normalizePersonalProgrammeItem(
        programmeFixture({
          id: `event:${uuid}`,
          sourceType: "MATCH",
        }),
      );
      const task = normalizePersonalTaskCalendarItem({
        id: buildTaskProjectionId(uuid),
        sourceType: "TASK",
        title: "Task",
        startAt: new Date("2026-09-11T12:00:00.000Z"),
        typeLabel: "Aufgabe",
        ariaLabel: "Task",
      });

      expect(training.id).not.toBe(match.id);
      expect(training.id).not.toBe(task.id);
      expect(parseCalendarResourceIdentity(training.id).sourceId).toBe(uuid);
      expect(parseCalendarResourceIdentity(match.id).sourceId).toBe(uuid);
      expect(parseCalendarResourceIdentity(task.id).sourceId).toBe(uuid);
    });
  });

  describe("normalization", () => {
    const cases: Array<{ sourceType: PersonalProgrammeItem["sourceType"]; idPrefix: string }> = [
      { sourceType: "TRAINING", idPrefix: "training-session" },
      { sourceType: "MATCH", idPrefix: "event" },
      { sourceType: "TOURNAMENT", idPrefix: "event" },
      { sourceType: "EVENT", idPrefix: "event" },
      { sourceType: "MEETING", idPrefix: "meeting" },
    ];

    it.each(cases)("maps %s programme rows", ({ sourceType, idPrefix }) => {
      const item = normalizePersonalProgrammeItem(
        programmeFixture({
          id: `${idPrefix}:norm-1`,
          sourceType,
          deepLink:
            sourceType === "TRAINING"
              ? "/dashboard/training/sessions/norm-1/edit"
              : sourceType === "MEETING"
                ? "/vereinsleitung/meetings/slug-1"
                : "/dashboard/planner/edit/norm-1",
        }),
      );
      expect(item.semanticType).toBe(sourceType);
      expect(item.startAt).toBeInstanceOf(Date);
      expect(item.allDay).toBe(false);
    });

    it("maps task deadline rows with dueAt as calendar instant", () => {
      const dueAt = new Date("2026-09-15T12:00:00.000Z");
      const item = normalizePersonalTaskCalendarItem({
        id: buildTaskProjectionId("task-1"),
        sourceType: "TASK",
        title: "Due task",
        startAt: dueAt,
        allDay: true,
        href: "/dashboard/aufgaben/task-1",
        typeLabel: "Aufgabe",
        taskStatus: TaskStatus.OPEN,
        ariaLabel: "Due task",
      });
      expect(item.semanticType).toBe("TASK");
      expect(item.startAt).toEqual(dueAt);
      expect(item.deepLink).toBe("/dashboard/aufgaben/task-1");
    });
  });

  describe("deep links", () => {
    it("preserves canonical programme and task routes", () => {
      expect(
        normalizePersonalProgrammeItem(
          programmeFixture({
            id: "training-session:t1",
            sourceType: "TRAINING",
            deepLink: "/dashboard/training/sessions/t1/edit",
          }),
        ).deepLink,
      ).toBe("/dashboard/training/sessions/t1/edit");
      expect(
        normalizePersonalProgrammeItem(
          programmeFixture({
            id: "event:m1",
            sourceType: "MATCH",
            deepLink: "/dashboard/planner/edit/m1",
          }),
        ).deepLink,
      ).toBe("/dashboard/planner/edit/m1");
      expect(
        normalizePersonalTaskCalendarItem({
          id: buildTaskProjectionId("x"),
          sourceType: "TASK",
          title: "T",
          startAt: new Date(),
          typeLabel: "Aufgabe",
          ariaLabel: "T",
          href: "/dashboard/aufgaben/x",
        }).deepLink,
      ).toBe("/dashboard/aufgaben/x");
    });
  });

  describe("ordering", () => {
    it("sorts by startAt then semantic type then id", () => {
      const items = sortNormalizedCalendarItems([
        normalizePersonalProgrammeItem(
          programmeFixture({
            id: "event:b",
            sourceType: "MATCH",
            startsAt: new Date("2026-09-10T10:00:00.000Z"),
          }),
        ),
        normalizePersonalTaskCalendarItem({
          id: buildTaskProjectionId("a"),
          sourceType: "TASK",
          title: "Task",
          startAt: new Date("2026-09-10T10:00:00.000Z"),
          typeLabel: "Aufgabe",
          ariaLabel: "Task",
        }),
        normalizePersonalProgrammeItem(
          programmeFixture({
            id: "training-session:a",
            sourceType: "TRAINING",
            startsAt: new Date("2026-09-10T10:00:00.000Z"),
            deepLink: "/dashboard/training/sessions/a/edit",
          }),
        ),
      ]);
      expect(items.map((i) => i.semanticType)).toEqual(["TRAINING", "MATCH", "TASK"]);
    });
  });

  describe("month grid range", () => {
    it("uses Monday-first 5- or 6-week grid bounds", () => {
      for (const monthParam of ["2026-02", "2026-09"]) {
        const resolved = resolvePersonalProgrammeMonthGridRange({
          monthParam,
          timeZone: "Europe/Zurich",
        });
        expect(resolved.gridDayKeys.length % 7).toBe(0);
        expect(resolved.gridDayKeys.length).toBeGreaterThanOrEqual(35);
        expect(resolved.gridDayKeys.length).toBeLessThanOrEqual(42);
      }
    });
  });

  describe("timezone default month", () => {
    it("defaults monat from tenant timezone when server month differs", () => {
      const now = new Date("2025-12-31T20:00:00.000Z");
      const tenantMonth = parsePersonalKalenderUrlState({}, now, TIME_ZONE).month;
      const serverMonth = parsePersonalKalenderUrlState({}, now).month;
      expect(tenantMonth).toBe("2026-01");
      expect(serverMonth).toBe("2025-12");
    });

    it("keeps explicit monat=YYYY-MM stable", () => {
      const state = parsePersonalKalenderUrlState(
        { monat: "2026-09" },
        new Date("2025-12-31T20:00:00.000Z"),
        TIME_ZONE,
      );
      expect(state.month).toBe("2026-09");
    });
  });

  describe("loadPersonalCalendarMonthBundle filters", () => {
    const range = resolvePersonalProgrammeMonthGridRange({
      monthParam: "2026-09",
      timeZone: "Europe/Zurich",
    });

    beforeEach(() => {
      vi.mocked(loadPersonalProgramme).mockResolvedValue({
        items: [
          programmeFixture({
            id: "event:1",
            sourceType: "MATCH",
            title: "Match",
          }),
        ],
        range,
        teamIds: ["team-1"],
        hasLinkedPerson: true,
        supported: true,
      });
      vi.mocked(loadTaskDeadlineProjections).mockResolvedValue([
        {
          id: buildTaskProjectionId("task-1"),
          sourceType: "TASK",
          title: "Task",
          startAt: new Date("2026-09-12T12:00:00.000Z"),
          typeLabel: "Aufgabe",
          ariaLabel: "Task",
          href: "/dashboard/aufgaben/task-1",
        } satisfies PersonalCalendarItem,
      ]);
    });

    it("quelle=alle includes programme and tasks", async () => {
      const bundle = await loadPersonalCalendarMonthBundle({
        tenantId: "tenant-a",
        userId: "user-a",
        timeZone: "Europe/Zurich",
        monthParam: "2026-09",
        quelle: "alle",
        permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW],
      });
      expect(bundle.items.some((i) => i.semanticType === "MATCH")).toBe(true);
      expect(bundle.items.some((i) => i.semanticType === "TASK")).toBe(true);
      expect(loadPersonalProgramme).toHaveBeenCalled();
      expect(loadTaskDeadlineProjections).toHaveBeenCalled();
    });

    it("quelle=termine loads programme only", async () => {
      const bundle = await loadPersonalCalendarMonthBundle({
        tenantId: "tenant-a",
        userId: "user-a",
        timeZone: "Europe/Zurich",
        monthParam: "2026-09",
        quelle: "termine",
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      });
      expect(bundle.items.every((i) => i.semanticType !== "TASK")).toBe(true);
      expect(loadTaskDeadlineProjections).not.toHaveBeenCalled();
    });

    it("quelle=aufgaben loads tasks only", async () => {
      const bundle = await loadPersonalCalendarMonthBundle({
        tenantId: "tenant-a",
        userId: "user-a",
        timeZone: "Europe/Zurich",
        monthParam: "2026-09",
        quelle: "aufgaben",
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      });
      expect(bundle.items.every((i) => i.semanticType === "TASK")).toBe(true);
      expect(loadPersonalProgramme).not.toHaveBeenCalled();
    });

    it("respects tasks.view for task slice", async () => {
      await loadPersonalCalendarMonthBundle({
        tenantId: "tenant-a",
        userId: "user-a",
        timeZone: "Europe/Zurich",
        monthParam: "2026-09",
        quelle: "alle",
        permissionKeys: [PERMISSIONS.EVENTS_VIEW],
      });
      expect(loadTaskDeadlineProjections).toHaveBeenCalledWith(
        expect.objectContaining({ tasksViewAuthorized: false }),
      );
    });

    it("groups items by tenant-local day key", async () => {
      const bundle = await loadPersonalCalendarMonthBundle({
        tenantId: "tenant-a",
        userId: "user-a",
        timeZone: "Europe/Zurich",
        monthParam: "2026-09",
        quelle: "alle",
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      });
      for (const item of bundle.items) {
        const key = normalizedCalendarItemDayKey(item, "Europe/Zurich");
        expect(bundle.itemsByDayKey[key]?.some((row) => row.id === item.id)).toBe(true);
      }
    });
  });
});
