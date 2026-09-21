/**
 * AUFGABEN-06C — TASK_COMMENT notification behavior and recipient matrix.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType } from "@prisma/client";
import {
  buildTaskCommentDedupKey,
  notificationTypeCategory,
  taskWorkspaceCommentHref,
} from "@/lib/notifications/deduplication";
import { getDefaultNotificationPreferences, resolveEffectivePreference } from "@/lib/notifications/defaults";
import { buildTaskCommentCopy } from "@/lib/notifications/task-copy";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  loadPrefs: vi.fn(),
  createNotification: vi.fn(),
  filterReadable: vi.fn(),
  listFollowers: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

vi.mock("../task-mention-auth", () => ({
  filterUserIdsWhoCanReadTask: mocks.filterReadable,
}));

vi.mock("../task-follow-service", () => ({
  listTaskFollowerUserIds: mocks.listFollowers,
}));

vi.mock("@/lib/notifications/preference-service", () => ({
  loadEffectivePreferencesForUsers: mocks.loadPrefs,
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  createNotificationIdempotent: mocks.createNotification,
}));

import {
  emitTaskCommentNotifications,
  emitTaskCommentNotificationsInTx,
} from "../task-comment-producer";

const taskRow = {
  id: "task-1",
  tenantId: "tenant-a",
  title: "Turnierorganisation vorbereiten",
  visibilityScope: "ASSIGNEES_ONLY" as const,
  createdByUserId: "author-a",
  orgUnitId: null,
  orgUnit: null,
  assignees: [],
};

const AUTHOR = "author-a";
const FOLLOWER_B = "follower-b";
const FOLLOWER_C = "follower-c";
const FOLLOWER_D = "follower-d";
const MENTION_E = "mention-e";

describe("AUFGABEN-06C comment notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listFollowers.mockResolvedValue([FOLLOWER_B, FOLLOWER_C, FOLLOWER_D]);
    mocks.filterReadable.mockImplementation(
      async (_tenantId: string, _task: unknown, userIds: string[]) => userIds,
    );
    mocks.loadPrefs.mockImplementation(async (_tx, _tenant, userIds: string[]) => {
      return new Map(userIds.map((id) => [id, { inAppEnabled: true, emailEnabled: true }]));
    });
    mocks.transaction.mockImplementation(async (fn: (tx: object) => Promise<void>) => fn({}));
    mocks.createNotification.mockResolvedValue({ kind: "CREATED", notificationId: "n1" });
  });

  it("defaults enable IN_APP and EMAIL for TASK_COMMENT", () => {
    expect(getDefaultNotificationPreferences().TASK_COMMENT).toEqual({
      inAppEnabled: true,
      emailEnabled: true,
    });
  });

  it("F29 dedup key TASK_COMMENT:{commentId}:{userId}", () => {
    expect(
      buildTaskCommentDedupKey({ commentId: "comment-1", recipientUserId: FOLLOWER_B }),
    ).toBe("TASK_COMMENT:comment-1:follower-b");
  });

  it("category TASK for TASK_COMMENT", () => {
    expect(notificationTypeCategory(NotificationType.TASK_COMMENT)).toBe("TASK");
  });

  it("F22 — recipient matrix A/B/C/D/E with mention precedence", async () => {
    await emitTaskCommentNotifications(taskRow as never, {
      commentId: "comment-1",
      commentExcerpt: "Kannst du bitte die Reservation prüfen?",
      actorUserId: AUTHOR,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [FOLLOWER_C, MENTION_E],
    });

    const recipients = mocks.createNotification.mock.calls.map(
      (call) => call[1].recipientUserId as string,
    );
    expect(recipients.sort()).toEqual([FOLLOWER_B, FOLLOWER_D].sort());
    expect(recipients).not.toContain(AUTHOR);
    expect(recipients).not.toContain(FOLLOWER_C);
  });

  it("F19 author never receives TASK_COMMENT even when follower", async () => {
    mocks.listFollowers.mockResolvedValue([AUTHOR, FOLLOWER_B]);
    await emitTaskCommentNotifications(taskRow as never, {
      commentId: "comment-1",
      commentExcerpt: "Hi",
      actorUserId: AUTHOR,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [],
    });
    const recipients = mocks.createNotification.mock.calls.map(
      (call) => call[1].recipientUserId as string,
    );
    expect(recipients).toEqual([FOLLOWER_B]);
  });

  it("F24 access removed follower filtered before emit", async () => {
    mocks.filterReadable.mockResolvedValue([FOLLOWER_B]);
    await emitTaskCommentNotifications(taskRow as never, {
      commentId: "comment-1",
      commentExcerpt: "Hi",
      actorUserId: AUTHOR,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [],
    });
    expect(mocks.createNotification).toHaveBeenCalledTimes(1);
    expect(mocks.createNotification.mock.calls[0]?.[1].recipientUserId).toBe(FOLLOWER_B);
  });

  it("F28 retry uses stable dedup key", async () => {
    const tx = {};
    const payload = {
      tenantId: "tenant-a",
      taskId: "task-1",
      taskTitle: "T",
      commentId: "comment-1",
      commentExcerpt: "Hi",
      actorUserId: AUTHOR,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [],
    };
    await emitTaskCommentNotificationsInTx(tx as never, payload, [FOLLOWER_B]);
    await emitTaskCommentNotificationsInTx(tx as never, payload, [FOLLOWER_B]);
    expect(mocks.createNotification).toHaveBeenCalledTimes(2);
    expect(mocks.createNotification.mock.calls[0]?.[1].deduplicationKey).toBe(
      buildTaskCommentDedupKey({ commentId: "comment-1", recipientUserId: FOLLOWER_B }),
    );
  });

  it("F30/F31 preferences honored per recipient", async () => {
    mocks.loadPrefs.mockResolvedValue(
      new Map([[FOLLOWER_B, { inAppEnabled: false, emailEnabled: true }]]),
    );
    await emitTaskCommentNotificationsInTx(
      {} as never,
      {
        tenantId: "tenant-a",
        taskId: "task-1",
        taskTitle: "T",
        commentId: "comment-1",
        commentExcerpt: "Hi",
        actorUserId: AUTHOR,
        actorDisplayName: "Michael",
        excludeRecipientUserIds: [],
      },
      [FOLLOWER_B],
    );
    expect(mocks.createNotification.mock.calls[0]?.[1].preferences).toEqual({
      inAppEnabled: false,
      emailEnabled: true,
    });
    expect(
      resolveEffectivePreference("TASK_COMMENT", { inAppEnabled: true, emailEnabled: false }),
    ).toEqual({ inAppEnabled: true, emailEnabled: false });
  });

  it("F32 emit failure does not propagate", async () => {
    mocks.transaction.mockRejectedValue(new Error("delivery failed"));
    await expect(
      emitTaskCommentNotifications(taskRow as never, {
        commentId: "comment-1",
        commentExcerpt: "Hi",
        actorUserId: AUTHOR,
        actorDisplayName: "Michael",
        excludeRecipientUserIds: [],
      }),
    ).resolves.toBeUndefined();
  });

  it("uses TASK_COMMENT notification type", async () => {
    await emitTaskCommentNotificationsInTx(
      {} as never,
      {
        tenantId: "tenant-a",
        taskId: "task-1",
        taskTitle: "T",
        commentId: "comment-1",
        commentExcerpt: "Hi",
        actorUserId: AUTHOR,
        actorDisplayName: "Michael",
        excludeRecipientUserIds: [],
      },
      [FOLLOWER_B],
    );
    expect(mocks.createNotification.mock.calls[0]?.[1].type).toBe(NotificationType.TASK_COMMENT);
  });

  it("F25 — deep link reuses comment anchor (fresh auth required at navigation)", () => {
    expect(taskWorkspaceCommentHref("task-1", "comment-1")).toBe(
      "/dashboard/aufgaben/task-1#comment-comment-1",
    );
  });

  it("German-first copy with safe excerpt", () => {
    const copy = buildTaskCommentCopy({
      actorDisplayName: "Michael",
      taskTitle: "Turnierorganisation vorbereiten",
      commentExcerpt: "Kannst du bitte die Reservation prüfen?",
    });
    expect(copy.title).toContain("Michael");
    expect(copy.title).toContain("Turnierorganisation vorbereiten");
    expect(copy.body).toContain("Reservation");
  });
});
