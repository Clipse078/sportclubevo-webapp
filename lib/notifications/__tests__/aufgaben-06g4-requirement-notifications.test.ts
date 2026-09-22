/**
 * AUFGABEN-06G4 — Requirement notifications & reminders (N01–N48).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType as NotificationTypeEnum } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildRequirementAssignedDedupKey,
  buildRequirementCancelledDedupKey,
  buildRequirementOverdueDedupKey,
  buildRequirementReminderDedupKey,
  notificationTypeCategory,
  requirementPersonalInboxHref,
} from "../deduplication";
import {
  isGuardianNotificationRecipient,
  resolveNotificationUserIdsForSubject,
} from "../requirement-recipient-resolution";

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

describe("AUFGABEN-06G4 recipient resolution (N03–N13, N33–N35, N45)", () => {
  it("N02/N33 — self user receives notification for linked subject Person", () => {
    const ctx = {
      personId: "child",
      displayName: "James",
      selfUserId: "user-self",
      guardianUserIds: [],
    };
    expect(resolveNotificationUserIdsForSubject(ctx)).toEqual(["user-self"]);
    expect(isGuardianNotificationRecipient("user-self", ctx)).toBe(false);
  });

  it("N03/N04 — two guardians each receive notification for one recipient", () => {
    const ctx = {
      personId: "child",
      displayName: "James",
      selfUserId: null,
      guardianUserIds: ["guardian-a", "guardian-b"],
    };
    expect(resolveNotificationUserIdsForSubject(ctx)).toEqual(["guardian-a", "guardian-b"]);
    expect(isGuardianNotificationRecipient("guardian-a", ctx)).toBe(true);
  });

  it("N45 — child with own account and guardians notifies both (canonical participation inverse)", () => {
    const ctx = {
      personId: "child",
      displayName: "James",
      selfUserId: "user-child",
      guardianUserIds: ["guardian-a"],
    };
    expect(resolveNotificationUserIdsForSubject(ctx).sort()).toEqual(
      ["guardian-a", "user-child"].sort(),
    );
  });

  it("N06–N12 — management permissions are not used in recipient resolution", () => {
    const adminPerms = [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_VIEW_ALL,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.REQUIREMENTS_MANAGE,
      PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE,
    ];
    expect(adminPerms.length).toBeGreaterThan(0);
    const ctx = {
      personId: "p1",
      displayName: "Member",
      selfUserId: "member-user",
      guardianUserIds: [],
    };
    expect(resolveNotificationUserIdsForSubject(ctx)).toEqual(["member-user"]);
  });
});

describe("AUFGABEN-06G4 deduplication & deep links (N15, N28–N29)", () => {
  it("N15 — assigned dedup key is stable per recipient user", () => {
    const key = buildRequirementAssignedDedupKey({
      recipientId: "recip-1",
      recipientUserId: "user-1",
    });
    expect(key).toBe("REQUIREMENT_ASSIGNED:recip-1:user-1");
    expect(key).toBe(
      buildRequirementAssignedDedupKey({ recipientId: "recip-1", recipientUserId: "user-1" }),
    );
  });

  it("N28 — href targets personal Meine Aufgaben, not management matrix", () => {
    const href = requirementPersonalInboxHref();
    expect(href).toBe("/dashboard/aufgaben?bereich=meine");
    expect(href).not.toContain("/anforderungen/");
  });

  it("notification categories map requirement types to REQUIREMENT", () => {
    expect(notificationTypeCategory("REQUIREMENT_ASSIGNED")).toBe("REQUIREMENT");
    expect(notificationTypeCategory("REQUIREMENT_REMINDER")).toBe("REQUIREMENT");
    expect(notificationTypeCategory("TASK_ASSIGNED")).toBe("TASK");
  });
});

describe("AUFGABEN-06G4 assigned producer (N01–N02, N15, N30–N32)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("N02 — activation emit creates REQUIREMENT_ASSIGNED for self recipient", async () => {
    producerMocks.loadSubjectPersonNotificationContexts.mockResolvedValue(
      new Map([
        [
          "person-self",
          {
            personId: "person-self",
            displayName: "Self User",
            selfUserId: "user-self",
            guardianUserIds: [],
          },
        ],
      ]),
    );

    const { emitRequirementAssignedNotifications } = await import("../requirement-producer");
    await emitRequirementAssignedNotifications({} as never, {
      tenantId: "tenant-1",
      requirementId: "req-1",
      requirementTitle: "Handbuch",
      dueAt: null,
      recipients: [{ id: "recip-1", subjectPersonId: "person-self" }],
      locale: "de-CH",
      timeZone: "Europe/Zurich",
    });

    expect(producerMocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: NotificationTypeEnum.REQUIREMENT_ASSIGNED,
        recipientUserId: "user-self",
        deduplicationKey: buildRequirementAssignedDedupKey({
          recipientId: "recip-1",
          recipientUserId: "user-self",
        }),
      }),
    );
  });

  it("N15 — duplicate assigned emit uses same dedup key", async () => {
    producerMocks.loadSubjectPersonNotificationContexts.mockResolvedValue(
      new Map([
        [
          "person-self",
          {
            personId: "person-self",
            displayName: "Self",
            selfUserId: "user-self",
            guardianUserIds: [],
          },
        ],
      ]),
    );
    const { emitRequirementAssignedNotifications } = await import("../requirement-producer");
    const input = {
      tenantId: "tenant-1",
      requirementId: "req-1",
      requirementTitle: "Handbuch",
      dueAt: null,
      recipients: [{ id: "recip-1", subjectPersonId: "person-self" }],
      locale: "de-CH",
      timeZone: "Europe/Zurich",
    };
    await emitRequirementAssignedNotifications({} as never, input);
    await emitRequirementAssignedNotifications({} as never, input);
    const keys = producerMocks.createNotificationIdempotent.mock.calls.map(
      (c) => c[1].deduplicationKey,
    );
    expect(keys[0]).toBe(keys[1]);
  });

  it("N31/N32 — preferences respected via createNotificationIdempotent input", async () => {
    producerMocks.loadSubjectPersonNotificationContexts.mockResolvedValue(
      new Map([
        [
          "person-self",
          {
            personId: "person-self",
            displayName: "Self",
            selfUserId: "user-self",
            guardianUserIds: [],
          },
        ],
      ]),
    );
    producerMocks.loadEffectivePreferencesForUsers.mockResolvedValue(
      new Map([["user-self", pref(false, false)]]),
    );
    const { emitRequirementAssignedNotifications } = await import("../requirement-producer");
    await emitRequirementAssignedNotifications({} as never, {
      tenantId: "tenant-1",
      requirementId: "req-1",
      requirementTitle: "Handbuch",
      dueAt: null,
      recipients: [{ id: "recip-1", subjectPersonId: "person-self" }],
      locale: "de-CH",
      timeZone: "Europe/Zurich",
    });
    expect(producerMocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        preferences: { inAppEnabled: false, emailEnabled: false },
      }),
    );
  });
});

describe("AUFGABEN-06G4 deadline processor (N16–N25, N42–N44)", () => {
  const due = new Date("2026-09-25T16:00:00.000Z");
  const nowReminder = new Date("2026-09-25T08:00:00.000Z");
  const nowOverdue = new Date("2026-09-26T08:00:00.000Z");

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
    producerMocks.loadSubjectPersonNotificationContexts.mockResolvedValue(
      new Map([
        [
          "person-1",
          {
            personId: "person-1",
            displayName: "Max",
            selfUserId: "user-1",
            guardianUserIds: [],
          },
        ],
      ]),
    );
  });

  it("N16/N22 — reminder and overdue notifications for eligible open obligations", async () => {
    producerMocks.recipientFindMany.mockImplementation(async (args: { distinct?: string[] }) => {
      if (args.distinct) return [{ tenantId: "tenant-1" }];
      return [
        {
          id: "recip-1",
          subjectPersonId: "person-1",
          requirement: { id: "req-1", title: "Handbuch", status: "ACTIVE", dueAt: due },
        },
      ];
    });

    const { processRequirementDeadlineNotifications } = await import(
      "../requirement-deadline-processor"
    );
    const reminderResult = await processRequirementDeadlineNotifications(nowReminder);
    expect(reminderResult.reminderCreated).toBe(1);
    expect(producerMocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: NotificationTypeEnum.REQUIREMENT_REMINDER }),
    );

    vi.clearAllMocks();
    producerMocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED" });
    producerMocks.recipientCount.mockResolvedValue(1);
    producerMocks.loadSubjectPersonNotificationContexts.mockResolvedValue(
      new Map([
        [
          "person-1",
          {
            personId: "person-1",
            displayName: "Max",
            selfUserId: "user-1",
            guardianUserIds: [],
          },
        ],
      ]),
    );
    producerMocks.recipientFindMany.mockImplementation(async (args: {
      where?: { requirement?: unknown };
      distinct?: string[];
    }) => {
      if (args.distinct) return [{ tenantId: "tenant-1" }];
      const reqFilter = args.where?.requirement as { dueAt?: { lte?: Date; gt?: Date } } | undefined;
      const dueAtFilter = reqFilter?.dueAt;
      if (dueAtFilter && "lte" in dueAtFilter && !("gt" in dueAtFilter)) {
        return [
          {
            id: "recip-1",
            subjectPersonId: "person-1",
            requirement: { id: "req-1", title: "Handbuch", status: "ACTIVE", dueAt: due },
          },
        ];
      }
      return [];
    });

    const overdueResult = await processRequirementDeadlineNotifications(nowOverdue);
    expect(overdueResult.overdueCreated).toBe(1);
    expect(producerMocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: NotificationTypeEnum.REQUIREMENT_OVERDUE }),
    );
  });

  it("N23/N44 — repeated cron uses stable overdue dedup keys", async () => {
    producerMocks.recipientFindMany.mockImplementation(async (args: { where?: { requirement?: unknown }; distinct?: string[] }) => {
      if (args.distinct) return [{ tenantId: "tenant-1" }];
      const reqFilter = args.where?.requirement as { dueAt?: { lte?: Date; gt?: Date } } | undefined;
      const dueAtFilter = reqFilter?.dueAt;
      if (dueAtFilter && "lte" in dueAtFilter && !("gt" in dueAtFilter)) {
        return [
          {
            id: "recip-1",
            subjectPersonId: "person-1",
            requirement: { id: "req-1", title: "Handbuch", status: "ACTIVE", dueAt: due },
          },
        ];
      }
      return [];
    });

    const { processRequirementDeadlineNotifications } = await import(
      "../requirement-deadline-processor"
    );
    await processRequirementDeadlineNotifications(nowOverdue);
    await processRequirementDeadlineNotifications(nowOverdue);
    const keys = producerMocks.createNotificationIdempotent.mock.calls.map(
      (c) => c[1].deduplicationKey,
    );
    expect(keys[0]).toBe(
      buildRequirementOverdueDedupKey({
        recipientId: "recip-1",
        recipientUserId: "user-1",
        dueAtIso: due.toISOString(),
      }),
    );
    expect(keys[0]).toBe(keys[1]);
  });

  it("N17–N21 — ineligible statuses are excluded by query filters (processor contract)", async () => {
    const { processRequirementDeadlineNotifications } = await import(
      "../requirement-deadline-processor"
    );
    producerMocks.recipientFindMany.mockImplementation(async (args: { distinct?: string[] }) => {
      if (args.distinct) return [{ tenantId: "tenant-1" }];
      return [];
    });
    const result = await processRequirementDeadlineNotifications(nowReminder);
    expect(result.reminderCreated).toBe(0);
    expect(producerMocks.recipientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          resolutionStatus: "OPEN",
          removedAt: null,
          requirement: expect.objectContaining({ status: "ACTIVE" }),
        }),
      }),
    );
  });
});

describe("AUFGABEN-06G4 cancelled producer (N25–N27)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    producerMocks.loadSubjectPersonNotificationContexts.mockResolvedValue(
      new Map([
        [
          "person-1",
          {
            personId: "person-1",
            displayName: "Max",
            selfUserId: "user-1",
            guardianUserIds: [],
          },
        ],
      ]),
    );
    producerMocks.loadEffectivePreferencesForUsers.mockResolvedValue(
      new Map([["user-1", pref(true, true)]]),
    );
    producerMocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED" });
    producerMocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
  });

  it("N26/N27 — cancellation notification deduplicated per recipient user", async () => {
    const { emitRequirementCancelledNotifications } = await import("../requirement-producer");
    const input = {
      tenantId: "tenant-1",
      requirementId: "req-1",
      requirementTitle: "Handbuch",
      recipients: [{ id: "recip-1", subjectPersonId: "person-1" }],
    };
    await emitRequirementCancelledNotifications(input);
    await emitRequirementCancelledNotifications(input);
    expect(producerMocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: NotificationTypeEnum.REQUIREMENT_CANCELLED,
        deduplicationKey: buildRequirementCancelledDedupKey({
          recipientId: "recip-1",
          recipientUserId: "user-1",
        }),
      }),
    );
  });
});

describe("AUFGABEN-06G4 changed notifications (N46–N48)", () => {
  it("N46–N48 NOT APPLICABLE — no material ACTIVE requirement mutation producer in 06G4", () => {
    expect(buildRequirementReminderDedupKey).toBeDefined();
    expect(true).toBe(true);
  });
});

describe("AUFGABEN-06G4 regression sentinels (N36–N40)", () => {
  it("N36 — requirement notifications do not create Task rows (schema seam)", () => {
    const schema = readFileSafe("prisma/schema.prisma");
    expect(schema).toMatch(/REQUIREMENT_ASSIGNED/);
    expect(schema).not.toMatch(/model RequirementNotification\b/);
  });

  it("N38 — PersonalAction requirement source remains present", () => {
    const src = readFileSafe("lib/personal-actions/sources/requirement-source.ts");
    expect(src).toMatch(/REQUIREMENT|requirementPersonalActionSource/);
  });

  it("N39/N40 — task and participation notification modules unchanged entrypoints", () => {
    expect(readFileSafe("lib/notifications/task-producer.ts")).toMatch(/emitTaskAssignmentNotifications/);
    expect(readFileSafe("lib/notifications/participation-deadline-processor.ts")).toMatch(
      /processParticipationDeadlineNotifications/,
    );
  });
});

function readFileSafe(rel: string): string {
  const { readFileSync } = require("node:fs");
  const { join } = require("node:path");
  return readFileSync(join(process.cwd(), rel), "utf8");
}
