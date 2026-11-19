import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadRecord: vi.fn(),
  canView: vi.fn(),
  loadPrefs: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("@/lib/club-meldungen/meldung-mention-auth", () => ({
  loadMeldungMentionAccessRecord: mocks.loadRecord,
  canUserViewMeldungInternalNow: mocks.canView,
}));

vi.mock("@/lib/notifications/preference-service", () => ({
  loadEffectivePreferencesForUsers: mocks.loadPrefs,
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  createNotificationIdempotent: mocks.createNotification,
}));

import { emitMeldungMentionNotificationsInTx } from "../meldung-mention-producer";

describe("meldung mention notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadRecord.mockResolvedValue({
      accountableUserId: "acc",
      reporterUserId: "rep",
      collaboratorUserIds: [],
    });
    mocks.canView.mockResolvedValue(true);
    mocks.loadPrefs.mockResolvedValue(
      new Map([
        [
          "mentioned",
          { inAppEnabled: true, emailEnabled: false, pushEnabled: false },
        ],
      ]),
    );
  });

  it("deduplicates recipients and skips self-mentions", async () => {
    await emitMeldungMentionNotificationsInTx({} as never, {
      tenantId: "t1",
      tenantKey: "club",
      meldungId: "m1",
      caseNumber: "M-1",
      messageId: "msg-1",
      commentExcerpt: "Hi",
      actorUserId: "author",
      actorDisplayName: "Author",
      mentionedUserIds: ["author", "mentioned", "mentioned"],
    });

    expect(mocks.createNotification).toHaveBeenCalledTimes(1);
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        recipientUserId: "mentioned",
        deduplicationKey: "MELDUNG_MENTION:msg-1:mentioned",
      }),
    );
  });
});