/**
 * AUFGABEN-06B — TASK_MENTION notification behavior.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType } from "@prisma/client";
import { buildTaskMentionDedupKey, taskWorkspaceCommentHref } from "@/lib/notifications/deduplication";
import { getDefaultNotificationPreferences } from "@/lib/notifications/defaults";
import { buildTaskMentionCopy } from "@/lib/notifications/task-copy";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  loadPrefs: vi.fn(),
  createNotification: vi.fn(),
  canReadNow: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

vi.mock("../task-mention-auth", () => ({
  canUserReadTaskNow: mocks.canReadNow,
}));

vi.mock("@/lib/notifications/preference-service", () => ({
  loadEffectivePreferencesForUsers: mocks.loadPrefs,
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  createNotificationIdempotent: mocks.createNotification,
}));

import { emitTaskMentionNotifications } from "../task-mention-producer";

const taskRow = {
  id: "task-1",
  tenantId: "tenant-a",
  title: "Getränkebestellung prüfen",
  visibilityScope: "ASSIGNEES_ONLY" as const,
  createdByUserId: "author",
  orgUnitId: null,
  orgUnit: null,
  assignees: [{ userId: "assignee", assignedAt: new Date(), user: { id: "assignee", firstName: "A", lastName: "B" } }],
};

describe("AUFGABEN-06B mention notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canReadNow.mockResolvedValue(true);
    mocks.loadPrefs.mockResolvedValue(
      new Map([
        [
          "mentioned",
          { inAppEnabled: true, emailEnabled: true },
        ],
      ]),
    );
    mocks.transaction.mockImplementation(async (fn: (tx: object) => Promise<void>) => fn({}));
    mocks.createNotification.mockResolvedValue({ kind: "CREATED", notificationId: "n1" });
  });

  it("defaults enable IN_APP and EMAIL for TASK_MENTION", () => {
    expect(getDefaultNotificationPreferences().TASK_MENTION).toEqual({
      inAppEnabled: true,
      emailEnabled: true,
    });
  });

  it("M17/M29 one notification per commentId+userId (dedup key)", async () => {
    await emitTaskMentionNotifications(taskRow as never, {
      commentId: "comment-1",
      commentExcerpt: "Hallo",
      actorUserId: "author",
      actorDisplayName: "Michael",
      mentionedUserIds: ["mentioned", "mentioned"],
    });

    expect(mocks.createNotification).toHaveBeenCalledTimes(1);
    expect(mocks.createNotification.mock.calls[0]?.[1].deduplicationKey).toBe(
      buildTaskMentionDedupKey({ commentId: "comment-1", recipientUserId: "mentioned" }),
    );
  });

  it("M22 self mention suppressed", async () => {
    await emitTaskMentionNotifications(taskRow as never, {
      commentId: "comment-1",
      commentExcerpt: "Hallo",
      actorUserId: "author",
      actorDisplayName: "Michael",
      mentionedUserIds: ["author"],
    });
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it("deep link includes comment anchor", () => {
    expect(taskWorkspaceCommentHref("task-1", "comment-1")).toBe(
      "/dashboard/aufgaben/task-1#comment-comment-1",
    );
  });

  it("copy is German-first and includes task title", () => {
    const copy = buildTaskMentionCopy({
      actorDisplayName: "Michael",
      taskTitle: "Getränkebestellung prüfen",
      commentExcerpt: "@Sandra bitte prüfen",
    });
    expect(copy.title).toContain("Michael");
    expect(copy.body).toContain("Getränkebestellung prüfen");
  });

  it("M30 emit failure does not propagate (comment persistence is separate)", async () => {
    mocks.transaction.mockRejectedValue(new Error("email pipeline"));
    await expect(
      emitTaskMentionNotifications(taskRow as never, {
        commentId: "comment-1",
        commentExcerpt: "Hallo",
        actorUserId: "author",
        actorDisplayName: "Michael",
        mentionedUserIds: ["mentioned"],
      }),
    ).resolves.toBeUndefined();
  });

  it("uses TASK_MENTION notification type", async () => {
    await emitTaskMentionNotifications(taskRow as never, {
      commentId: "comment-1",
      commentExcerpt: "Hallo",
      actorUserId: "author",
      actorDisplayName: "Michael",
      mentionedUserIds: ["mentioned"],
    });
    expect(mocks.createNotification.mock.calls[0]?.[1].type).toBe(NotificationType.TASK_MENTION);
  });
});
