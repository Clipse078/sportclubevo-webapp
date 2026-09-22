/**
 * AUFGABEN-06G10 — Requirement notification & reminder operational polish (N1–N18).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType as NotificationTypeEnum } from "@prisma/client";
import {
  buildRequirementAssignedDedupKey,
  buildRequirementReminderDedupKey,
  requirementPersonalExecutionHref,
} from "../deduplication";
import {
  buildRequirementReminderCopy,
  type RequirementAutomaticReminderChannel,
} from "../requirement-copy";
import {
  isRequirementDueAtInReminderWindow,
  openRequirementRecipientExplicitReminderWhere,
  openRequirementRecipientReminderWhere,
} from "@/lib/requirements/requirement-deadlines";
import { TASK_DUE_SOON_LEAD_MS } from "../constants";

const producerMocks = vi.hoisted(() => ({
  loadSubjectPersonNotificationContexts: vi.fn(),
  createNotificationIdempotent: vi.fn(),
  loadEffectivePreferencesForUsers: vi.fn(),
  personFindMany: vi.fn(),
  recipientFindMany: vi.fn(),
  recipientCount: vi.fn(),
  tenantFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../requirement-recipient-resolution", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../requirement-recipient-resolution")>();
  return {
    ...actual,
    loadSubjectPersonNotificationContexts: producerMocks.loadSubjectPersonNotificationContexts,
  };
});

vi.mock("../notification-service", () => ({
  createNotificationIdempotent: producerMocks.createNotificationIdempotent,
}));

vi.mock("../preference-service", () => ({
  loadEffectivePreferencesForUsers: producerMocks.loadEffectivePreferencesForUsers,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    person: { findMany: producerMocks.personFindMany },
    requirementRecipient: {
      findMany: producerMocks.recipientFindMany,
      count: producerMocks.recipientCount,
    },
    tenant: { findUnique: producerMocks.tenantFindUnique },
    $transaction: producerMocks.transaction,
  },
}));

function pref(inApp = true, email = true) {
  return { inAppEnabled: inApp, emailEnabled: email };
}

const subjectContext = new Map([
  [
    "person-1",
    {
      personId: "person-1",
      displayName: "Max",
      selfUserId: "user-1",
      guardianUserIds: [] as string[],
    },
  ],
]);

type DeadlineRecipientRow = {
  id: string;
  subjectPersonId: string;
  requirement: { id: string; title: string; status: string; dueAt: Date };
};

function installDeadlineMock(rows: {
  legacyDueSoon?: DeadlineRecipientRow[];
  explicitStage1?: DeadlineRecipientRow[];
  explicitStage2?: DeadlineRecipientRow[];
  overdue?: DeadlineRecipientRow[];
}) {
  producerMocks.recipientFindMany.mockImplementation(
    async (args: { where?: { requirement?: unknown }; distinct?: string[] }) => {
      if (args.distinct) return [{ tenantId: "tenant-1" }];
      const reqFilter = args.where?.requirement as
        | {
            dueAt?: { lte?: Date; gt?: Date };
            remindersConfigured?: boolean;
            reminder1At?: unknown;
            reminder2At?: unknown;
          }
        | undefined;
      if (!reqFilter) return [];
      const dueAtFilter = reqFilter.dueAt;
      if (dueAtFilter && "lte" in dueAtFilter && !("gt" in dueAtFilter)) {
        return rows.overdue ?? [];
      }
      if (
        reqFilter.remindersConfigured === false &&
        dueAtFilter &&
        "gt" in dueAtFilter &&
        "lte" in dueAtFilter
      ) {
        return rows.legacyDueSoon ?? [];
      }
      if (reqFilter.remindersConfigured === true && reqFilter.reminder1At !== undefined) {
        return rows.explicitStage1 ?? [];
      }
      if (reqFilter.remindersConfigured === true && reqFilter.reminder2At !== undefined) {
        return rows.explicitStage2 ?? [];
      }
      return [];
    },
  );
}

describe("AUFGABEN-06G10 activation & href (N1–N3, N18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    producerMocks.loadSubjectPersonNotificationContexts.mockResolvedValue(subjectContext);
    producerMocks.loadEffectivePreferencesForUsers.mockImplementation(
      async (_tx, _tenant, userIds: string[]) => {
        const map = new Map<string, ReturnType<typeof pref>>();
        for (const id of userIds) map.set(id, pref(true, true));
        return map;
      },
    );
    producerMocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED" });
    producerMocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
  });

  it("N1/N2/N18 — activation notification uses personal execution href", async () => {
    const { emitRequirementAssignedNotifications } = await import("../requirement-producer");
    await emitRequirementAssignedNotifications({} as never, {
      tenantId: "tenant-1",
      requirementId: "req-1",
      requirementTitle: "Handbuch",
      dueAt: null,
      recipients: [{ id: "recip-1", subjectPersonId: "person-1" }],
      locale: "de-CH",
      timeZone: "Europe/Zurich",
    });

    expect(producerMocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: NotificationTypeEnum.REQUIREMENT_ASSIGNED,
        href: requirementPersonalExecutionHref("recip-1"),
        deduplicationKey: buildRequirementAssignedDedupKey({
          recipientId: "recip-1",
          recipientUserId: "user-1",
        }),
      }),
    );
  });

  it("N3 — personal execution href is recipient-scoped (no management route)", () => {
    const href = requirementPersonalExecutionHref("recip-abc");
    expect(href).toBe("/dashboard/aufgaben/anforderung/recip-abc");
    expect(href).not.toContain("/anforderungen/");
  });
});

describe("AUFGABEN-06G10 reminder contract (N4–N9, N12, N16–N17)", () => {
  const due = new Date("2026-09-25T16:00:00.000Z");
  const nowReminder = new Date("2026-09-25T08:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    producerMocks.tenantFindUnique.mockResolvedValue({ locale: "de-CH", timezone: "Europe/Zurich" });
    producerMocks.loadEffectivePreferencesForUsers.mockImplementation(
      async (_tx, _tenant, userIds: string[]) => {
        const map = new Map<string, ReturnType<typeof pref>>();
        for (const id of userIds) map.set(id, pref(true, true));
        return map;
      },
    );
    producerMocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED" });
    producerMocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
    producerMocks.recipientCount.mockResolvedValue(1);
    producerMocks.loadSubjectPersonNotificationContexts.mockResolvedValue(subjectContext);
  });

  it("N16 — legacy due-soon path emits one reminder (not triple-counted across stages)", async () => {
    installDeadlineMock({
      legacyDueSoon: [
        {
          id: "recip-1",
          subjectPersonId: "person-1",
          requirement: { id: "req-1", title: "Handbuch", status: "ACTIVE", dueAt: due },
        },
      ],
    });

    const { processRequirementDeadlineNotifications } = await import(
      "../requirement-deadline-processor"
    );
    const result = await processRequirementDeadlineNotifications(nowReminder);
    expect(result.reminderCreated).toBe(1);

    const dedupKeys = producerMocks.createNotificationIdempotent.mock.calls
      .filter((c) => c[1].type === NotificationTypeEnum.REQUIREMENT_REMINDER)
      .map((c) => c[1].deduplicationKey as string);
    expect(dedupKeys).toEqual([
      buildRequirementReminderDedupKey({
        recipientId: "recip-1",
        recipientUserId: "user-1",
        dueAtIso: due.toISOString(),
      }),
    ]);
  });

  it("N6 — configured reminder stages use distinct dedup keys", async () => {
    const row = {
      id: "recip-1",
      subjectPersonId: "person-1",
      requirement: { id: "req-1", title: "Handbuch", status: "ACTIVE", dueAt: due },
    };
    installDeadlineMock({
      explicitStage1: [row],
      explicitStage2: [row],
    });

    const { processRequirementDeadlineNotifications } = await import(
      "../requirement-deadline-processor"
    );
    const result = await processRequirementDeadlineNotifications(nowReminder);
    expect(result.reminderCreated).toBe(2);

    const keys = producerMocks.createNotificationIdempotent.mock.calls
      .filter((c) => c[1].type === NotificationTypeEnum.REQUIREMENT_REMINDER)
      .map((c) => c[1].deduplicationKey as string)
      .sort();
    expect(keys).toEqual(
      [
        buildRequirementReminderDedupKey({
          recipientId: "recip-1",
          recipientUserId: "user-1",
          dueAtIso: `${due.toISOString()}:r1`,
        }),
        buildRequirementReminderDedupKey({
          recipientId: "recip-1",
          recipientUserId: "user-1",
          dueAtIso: `${due.toISOString()}:r2`,
        }),
      ].sort(),
    );
  });

  it("N5/N17 — reprocessing same stage is idempotent when dedupe returns DEDUPLICATED", async () => {
    installDeadlineMock({
      legacyDueSoon: [
        {
          id: "recip-1",
          subjectPersonId: "person-1",
          requirement: { id: "req-1", title: "Handbuch", status: "ACTIVE", dueAt: due },
        },
      ],
    });
    producerMocks.createNotificationIdempotent
      .mockResolvedValueOnce({ kind: "CREATED" })
      .mockResolvedValueOnce({ kind: "DEDUPLICATED" })
      .mockResolvedValueOnce({ kind: "DEDUPLICATED" });

    const { processRequirementDeadlineNotifications } = await import(
      "../requirement-deadline-processor"
    );
    const first = await processRequirementDeadlineNotifications(nowReminder);
    const second = await processRequirementDeadlineNotifications(nowReminder);
    expect(first.reminderCreated).toBe(1);
    expect(second.reminderCreated).toBe(0);
  });

  it("N7/N8/N9 — ineligible recipients excluded by canonical where filters", async () => {
    installDeadlineMock({});
    const { processRequirementDeadlineNotifications } = await import(
      "../requirement-deadline-processor"
    );
    const result = await processRequirementDeadlineNotifications(nowReminder);
    expect(result.reminderCreated).toBe(0);
    expect(producerMocks.recipientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          resolutionStatus: "OPEN",
          removedAt: null,
          requirement: expect.objectContaining({ status: "ACTIVE", remindersConfigured: false }),
        }),
      }),
    );
  });

  it("N12 — reminder window uses shared TASK_DUE_SOON lead constant", () => {
    expect(
      isRequirementDueAtInReminderWindow(due, nowReminder, TASK_DUE_SOON_LEAD_MS),
    ).toBe(true);
    const legacyWhere = openRequirementRecipientReminderWhere(nowReminder, TASK_DUE_SOON_LEAD_MS);
    expect(legacyWhere.requirement).toMatchObject({ remindersConfigured: false });
    expect(openRequirementRecipientExplicitReminderWhere(nowReminder, 1).requirement).toMatchObject({
      remindersConfigured: true,
    });
  });
});

describe("AUFGABEN-06G10 reminder copy (N8 UX)", () => {
  const channels: RequirementAutomaticReminderChannel[] = [
    "due_soon_window",
    "configured_stage_1",
    "configured_stage_2",
  ];

  it("distinct stage hints in reminder body", () => {
    const bodies = channels.map(
      (reminderChannel) =>
        buildRequirementReminderCopy({
          requirementTitle: "Handbuch",
          notifyAsGuardian: false,
          dueLabel: "25.09.2026",
          reminderChannel,
        }).body,
    );
    expect(new Set(bodies).size).toBe(3);
    expect(bodies.some((b) => b.includes("Fällig:"))).toBe(true);
  });
});

describe("AUFGABEN-06G10 manual reminder seam (N12 management)", () => {
  it("N12 — no canonical manual remind API in requirements module", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const management = readFileSync(
      join(process.cwd(), "lib/requirements/management-service.ts"),
      "utf8",
    );
    expect(management).not.toMatch(/manualReminder|sendRequirementReminder|Erinnern/i);
  });
});

describe("AUFGABEN-06G10 notification center presentation", () => {
  it("requirement reminder and overdue map to distinct icons", async () => {
    const { notificationListIcon } = await import("../notification-presentation");
    const reminder = notificationListIcon({ category: "REQUIREMENT", type: "REQUIREMENT_REMINDER" });
    const overdue = notificationListIcon({ category: "REQUIREMENT", type: "REQUIREMENT_OVERDUE" });
    const task = notificationListIcon({ category: "TASK", type: "TASK_ASSIGNED" });
    expect(reminder.Icon).not.toBe(task.Icon);
    expect(overdue.Icon).not.toBe(reminder.Icon);
    expect(overdue.Icon).not.toBe(task.Icon);
  });
});

describe("AUFGABEN-06G10 regression sentinels (N15)", () => {
  it("N15 — task notification producer entrypoint unchanged", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const taskProducer = readFileSync(join(process.cwd(), "lib/notifications/task-producer.ts"), "utf8");
    expect(taskProducer).toMatch(/emitTaskAssignmentNotifications/);
  });
});
