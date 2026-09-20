import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";
import {
  calculateReminderAtFromPreset,
  formatTaskDeadlineLabel,
  isLegacyDateOnlyDueAtIso,
  parseTaskDueAtFromForm,
  resolveTaskReminderSchedule,
  recomputeRemindersForDueChange,
  taskHasExplicitReminders,
} from "../task-reminder-schedule";
import { buildTaskReminderDedupKey } from "@/lib/notifications/deduplication";

describe("AUFGABEN-05 task reminders — schedule", () => {
  const tz = "Europe/Zurich";

  it("R1 — task with deadline and no reminders valid", () => {
    const dueAt = new Date("2026-09-30T15:00:00.000Z");
    const resolved = resolveTaskReminderSchedule({
      dueAt,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: null,
      reminder2PresetKey: null,
      timeZone: tz,
    });
    expect(resolved.reminder1At).toBeNull();
    expect(resolved.reminder2At).toBeNull();
  });

  it("R2 — reminder without deadline rejected", () => {
    expect(() =>
      resolveTaskReminderSchedule({
        dueAt: null,
        reminder1At: null,
        reminder2At: null,
        reminder1PresetKey: "DAYS_1",
        reminder2PresetKey: null,
        timeZone: tz,
      }),
    ).toThrow(/deadline/i);
  });

  it("R3/R4/R5 — ordered preset reminders", () => {
    const dueAt = parseTaskDueAtFromForm({
      dateRaw: "2026-09-30",
      timeRaw: "17:00",
      timeZone: tz,
    }) as Date;
    const resolved = resolveTaskReminderSchedule({
      dueAt,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: "DAYS_3",
      reminder2PresetKey: "DAYS_1",
      timeZone: tz,
    });
    expect(resolved.reminder1At!.getTime()).toBeLessThan(resolved.reminder2At!.getTime());
    expect(resolved.reminder2At!.getTime()).toBeLessThan(dueAt.getTime());
  });

  it("R6 — R1 >= R2 rejected", () => {
    const dueAt = new Date("2026-09-30T15:00:00.000Z");
    expect(() =>
      resolveTaskReminderSchedule({
        dueAt,
        reminder1At: new Date("2026-09-29T15:00:00.000Z"),
        reminder2At: new Date("2026-09-28T15:00:00.000Z"),
        reminder1PresetKey: null,
        reminder2PresetKey: null,
        timeZone: tz,
      }),
    ).toThrow(/earlier/i);
  });

  it("R7/R8 — reminder on/after deadline rejected", () => {
    const dueAt = new Date("2026-09-30T15:00:00.000Z");
    expect(() =>
      resolveTaskReminderSchedule({
        dueAt,
        reminder1At: null,
        reminder2At: dueAt,
        reminder1PresetKey: null,
        reminder2PresetKey: null,
        timeZone: tz,
      }),
    ).toThrow(/Reminder 2/);
  });

  it("R9 — removing deadline clears reminders", () => {
    const cleared = recomputeRemindersForDueChange({
      dueAt: null,
      reminder1At: new Date(),
      reminder2At: new Date(),
      reminder1PresetKey: "DAYS_1",
      reminder2PresetKey: "DAYS_1",
      timeZone: tz,
    });
    expect(cleared.reminder1At).toBeNull();
    expect(cleared.reminder2At).toBeNull();
  });

  it("R39 — same-day preset remains before deadline", () => {
    const dueAt = parseTaskDueAtFromForm({
      dateRaw: "2026-09-30",
      timeRaw: "17:00",
      timeZone: tz,
    }) as Date;
    const r1 = calculateReminderAtFromPreset({ dueAt, presetKey: "SAME_DAY", timeZone: tz });
    expect(r1.getTime()).toBeLessThan(dueAt.getTime());
  });

  it("R10 — same-day rejected when deadline is before 09:00 local", () => {
    const dueAt = parseTaskDueAtFromForm({
      dateRaw: "2026-09-30",
      timeRaw: "08:00",
      timeZone: tz,
    }) as Date;
    expect(() =>
      resolveTaskReminderSchedule({
        dueAt,
        reminder1At: null,
        reminder2At: null,
        reminder1PresetKey: "SAME_DAY",
        reminder2PresetKey: null,
        timeZone: tz,
      }),
    ).toThrow(/Reminder 1/);
  });

  it("R8 — date-only deadline uses 09:00 local for day presets (not T12:00Z hour)", () => {
    const dueAt = parseTaskDueAtFromForm({
      dateRaw: "2026-09-30",
      timeRaw: "",
      timeZone: tz,
    }) as Date;
    expect(isLegacyDateOnlyDueAtIso(dueAt.toISOString())).toBe(true);
    const r1 = calculateReminderAtFromPreset({ dueAt, presetKey: "DAYS_1", timeZone: tz });
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).format(r1),
    );
    expect(hour).toBe(9);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(r1);
    expect(day).toBe("2026-09-29");
  });

  it("R6/R7 — legacy date-only winter/summer preserve date-only labels", () => {
    for (const iso of ["2026-01-15T12:00:00.000Z", "2026-07-15T12:00:00.000Z"]) {
      expect(isLegacyDateOnlyDueAtIso(iso)).toBe(true);
      const label = formatTaskDeadlineLabel(new Date(iso), "de-CH", tz);
      expect(label).not.toMatch(/12:00/);
    }
  });

  it("R9 — explicit Zurich deadline round-trip", () => {
    const dueAt = parseTaskDueAtFromForm({
      dateRaw: "2026-09-30",
      timeRaw: "17:00",
      timeZone: tz,
    }) as Date;
    const iso = dueAt.toISOString();
    const backTime = dueAt.toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    expect(backTime).toBe("17:00");
    expect(isLegacyDateOnlyDueAtIso(iso)).toBe(false);
  });

  it("R40 — 1-day preset preserves local wall-clock across DST boundary", () => {
    const dueAt = parseTaskDueAtFromForm({
      dateRaw: "2026-03-30",
      timeRaw: "17:00",
      timeZone: tz,
    }) as Date;
    const r1 = calculateReminderAtFromPreset({ dueAt, presetKey: "DAYS_1", timeZone: tz });
    const dueHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).format(dueAt),
    );
    const rHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).format(r1),
    );
    expect(rHour).toBe(dueHour);
  });

  it("R42 — dedup identity includes reminder timestamp", () => {
    const a = buildTaskReminderDedupKey({
      taskId: "t1",
      recipientUserId: "u1",
      stage: 1,
      reminderAtIso: "2026-09-27T15:00:00.000Z",
    });
    const b = buildTaskReminderDedupKey({
      taskId: "t1",
      recipientUserId: "u1",
      stage: 1,
      reminderAtIso: "2026-09-28T15:00:00.000Z",
    });
    expect(a).not.toBe(b);
  });

  it("legacy date-only dueAt detection", () => {
    expect(isLegacyDateOnlyDueAtIso("2026-09-30T12:00:00.000Z")).toBe(true);
    expect(isLegacyDateOnlyDueAtIso("2026-09-30T15:00:00.000Z")).toBe(false);
  });

  it("R29 helper — explicit reminders flag", () => {
    expect(taskHasExplicitReminders({ reminder1At: null, reminder2At: null })).toBe(false);
    expect(
      taskHasExplicitReminders({ reminder1At: new Date(), reminder2At: null }),
    ).toBe(true);
  });

  it("R43 — preset reminders shift when deadline changes", () => {
    const oldDue = parseTaskDueAtFromForm({
      dateRaw: "2026-09-30",
      timeRaw: "17:00",
      timeZone: tz,
    }) as Date;
    const first = resolveTaskReminderSchedule({
      dueAt: oldDue,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: "DAYS_1",
      reminder2PresetKey: null,
      timeZone: tz,
    });
    const newDue = parseTaskDueAtFromForm({
      dateRaw: "2026-10-05",
      timeRaw: "17:00",
      timeZone: tz,
    }) as Date;
    const shifted = recomputeRemindersForDueChange({
      dueAt: newDue,
      reminder1At: first.reminder1At,
      reminder2At: first.reminder2At,
      reminder1PresetKey: first.reminder1PresetKey,
      reminder2PresetKey: first.reminder2PresetKey,
      timeZone: tz,
    });
    expect(shifted.reminder1At!.getTime()).toBeGreaterThan(first.reminder1At!.getTime());
    expect(shifted.reminder1At!.getTime()).toBeLessThan(newDue.getTime());
  });
});

describe("AUFGABEN-05 task reminders — processor integration (mocked)", () => {
  const mocks = vi.hoisted(() => ({
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    transaction: vi.fn(),
    createNotificationIdempotent: vi.fn(),
    loadEffectivePreferencesForUsers: vi.fn(),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.count.mockResolvedValue(0);
    mocks.findMany.mockResolvedValue([]);
    mocks.findFirst.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue({ locale: "de-CH", timezone: "Europe/Zurich" });
    mocks.loadEffectivePreferencesForUsers.mockResolvedValue(
      new Map([["u1", { inAppEnabled: true, emailEnabled: true }]]),
    );
    mocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED" });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
  });

  it("R20/R29 — reminder fires; explicit reminder skips TASK_DUE_SOON", async () => {
    const now = new Date("2026-09-29T10:00:00.000Z");
    const dueAt = new Date("2026-09-30T10:00:00.000Z");
    const reminder1At = new Date("2026-09-28T10:00:00.000Z");

    mocks.findMany.mockImplementation(async (args: { where?: Record<string, unknown> }) => {
      const where = args.where ?? {};
      if (where.tenantId === undefined && where.OR) {
        return [{ tenantId: "tenant-1" }];
      }
      if (where.reminder1At) {
        if (where.id && where.reminder1At) {
          return [
            {
              id: "task-1",
              title: "T",
              dueAt,
              reminder1At,
              reminder2At: null,
              status: TaskStatus.OPEN,
              assignees: [{ userId: "u1" }],
            },
          ];
        }
        return [
          {
            id: "task-1",
            title: "T",
            dueAt,
            reminder1At,
            reminder2At: null,
            status: TaskStatus.OPEN,
            assignees: [{ userId: "u1" }],
          },
        ];
      }
      if (where.dueAt && where.reminder1At === undefined) {
        return [
          {
            id: "task-2",
            title: "Soon",
            dueAt,
            reminder1At: new Date(),
            reminder2At: null,
            status: TaskStatus.OPEN,
            assignees: [{ userId: "u1" }],
          },
        ];
      }
      return [];
    });

    mocks.findFirst.mockImplementation(async (args: { where?: Record<string, unknown> }) => {
      const rows = await mocks.findMany(args);
      return rows[0] ?? null;
    });

    vi.doMock("@/lib/db/prisma", () => ({
      prisma: {
        task: {
          findMany: mocks.findMany,
          findFirst: mocks.findFirst,
          count: mocks.count,
        },
        tenant: { findUnique: mocks.findUnique },
        $transaction: mocks.transaction,
      },
    }));
    vi.doMock("@/lib/notifications/notification-service", () => ({
      createNotificationIdempotent: mocks.createNotificationIdempotent,
    }));
    vi.doMock("@/lib/notifications/preference-service", () => ({
      loadEffectivePreferencesForUsers: mocks.loadEffectivePreferencesForUsers,
    }));

    const { processTaskDeadlineNotifications } = await import(
      "@/lib/notifications/deadline-processor"
    );
    const result = await processTaskDeadlineNotifications(now);
    expect(result.reminderCreated).toBeGreaterThan(0);
    expect(result.dueSoonCreated).toBe(0);
    expect(mocks.createNotificationIdempotent).toHaveBeenCalled();
  });

  it("R23 — stale reminder skipped after deadline passed", async () => {
    const now = new Date("2026-10-01T10:00:00.000Z");
    const dueAt = new Date("2026-09-30T10:00:00.000Z");
    const reminder1At = new Date("2026-09-28T10:00:00.000Z");

    mocks.findMany.mockImplementation(async (args: { where?: Record<string, unknown> }) => {
      const where = args.where ?? {};
      if (where.tenantId === undefined && where.OR) {
        return [{ tenantId: "tenant-1" }];
      }
      if (where.reminder1At) {
        return [];
      }
      return [];
    });

    mocks.findFirst.mockResolvedValue(null);

    vi.doMock("@/lib/db/prisma", () => ({
      prisma: {
        task: {
          findMany: mocks.findMany,
          findFirst: mocks.findFirst,
          count: mocks.count,
        },
        tenant: { findUnique: mocks.findUnique },
        $transaction: mocks.transaction,
      },
    }));
    vi.doMock("@/lib/notifications/notification-service", () => ({
      createNotificationIdempotent: mocks.createNotificationIdempotent,
    }));
    vi.doMock("@/lib/notifications/preference-service", () => ({
      loadEffectivePreferencesForUsers: mocks.loadEffectivePreferencesForUsers,
    }));

    const { processTaskDeadlineNotifications } = await import(
      "@/lib/notifications/deadline-processor"
    );
    const result = await processTaskDeadlineNotifications(now);
    expect(result.reminderCreated).toBe(0);
    expect(mocks.createNotificationIdempotent).not.toHaveBeenCalled();
  });
});
