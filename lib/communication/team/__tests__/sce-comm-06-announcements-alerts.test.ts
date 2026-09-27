import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acknowledgeTeamCommunication,
  getTeamCommunicationEngagementSummary,
  resolveAcknowledgementRequired,
  sendTeamFormalCommunication,
} from "@/lib/communication/team/team-formal-communication-service";
import {
  defaultNotificationTitleForKind,
  notificationTypeForCommunicationKind,
} from "@/lib/communication/team/team-communication-notification-kinds";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

const mocks = vi.hoisted(() => ({
  platformCommunication: { findFirst: vi.fn() },
  platformCommunicationRecipientSnapshot: { findMany: vi.fn(), update: vi.fn(), groupBy: vi.fn() },
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  attachSelectionToPlatformCommunication: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: mocks.platformCommunication,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
  },
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: (...args: unknown[]) => mocks.createTeamCommunicationDraft(...args),
  publishTeamCommunication: (...args: unknown[]) => mocks.publishTeamCommunication(...args),
  MAX_TEAM_COMMUNICATION_BODY_LENGTH: 8000,
}));

vi.mock("@/lib/communication/attachment-service", () => ({
  attachSelectionToPlatformCommunication: (...args: unknown[]) =>
    mocks.attachSelectionToPlatformCommunication(...args),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

describe("SCE-COMM-06 announcements & alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "comm-formal-1" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "comm-formal-1", recipientCount: 18 });
    mocks.logAction.mockResolvedValue(undefined);
  });

  it("resolves acknowledgement defaults per kind", () => {
    expect(resolveAcknowledgementRequired("ANNOUNCEMENT", undefined)).toBe(false);
    expect(resolveAcknowledgementRequired("ANNOUNCEMENT", true)).toBe(true);
    expect(resolveAcknowledgementRequired("ALERT", undefined)).toBe(true);
    expect(resolveAcknowledgementRequired("ALERT", false)).toBe(false);
  });

  it("maps notification types and titles by communication kind", () => {
    expect(notificationTypeForCommunicationKind("ANNOUNCEMENT")).toBe("TEAM_ANNOUNCEMENT_PUBLISHED");
    expect(notificationTypeForCommunicationKind("ALERT")).toBe("TEAM_ALERT_PUBLISHED");
    expect(notificationTypeForCommunicationKind("MESSAGE")).toBe("TEAM_COMMUNICATION_PUBLISHED");
    expect(defaultNotificationTitleForKind("ALERT", null)).toBe("Team-Alarm");
    expect(defaultNotificationTitleForKind("ANNOUNCEMENT", "Training")).toBe("Training");
  });

  it("creates and publishes announcement with audience preset and optional ack", async () => {
    const result = await sendTeamFormalCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-trainer",
      kind: "ANNOUNCEMENT",
      subject: "Training",
      bodyText: "Bitte neue Jacke mitbringen.",
      audiencePreset: "PLAYERS",
      acknowledgementRequired: true,
    });

    expect(result.recipientCount).toBe(18);
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ANNOUNCEMENT",
        acknowledgementRequired: true,
        audiencePreset: "PLAYERS",
      }),
    );
    expect(mocks.publishTeamCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ audiencePreset: "PLAYERS" }),
    );
  });

  it("requires alert title", async () => {
    await expect(
      sendTeamFormalCommunication({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-trainer",
        kind: "ALERT",
        bodyText: "Training fällt aus",
      }),
    ).rejects.toThrow(/title is required/);
  });

  it("publishes alert with default acknowledgement", async () => {
    await sendTeamFormalCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-trainer",
      kind: "ALERT",
      subject: "Training abgesagt",
      bodyText: "Wetter.",
    });

    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "ALERT", acknowledgementRequired: true }),
    );
  });

  it("acknowledges only for required communications and eligible recipients", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      status: "PUBLISHED",
      kind: "ANNOUNCEMENT",
      acknowledgementRequired: true,
      conversation: { teamId: "team-1" },
      senderPerson: { id: "p1", userId: "user-trainer" },
    });
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      { id: "snap-1", engagement: "READ", acknowledgedAt: null },
    ]);
    mocks.platformCommunicationRecipientSnapshot.update.mockResolvedValue({});

    const result = await acknowledgeTeamCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-1",
      actorUserId: "user-player",
    });

    expect(result.engagement).toBe("ACKNOWLEDGED");
    expect(mocks.platformCommunicationRecipientSnapshot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ engagement: "ACKNOWLEDGED" }),
      }),
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "COMMUNICATION_ACKNOWLEDGED" }),
    );
  });

  it("rejects acknowledgement from non-recipient", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      status: "PUBLISHED",
      kind: "ALERT",
      acknowledgementRequired: true,
      conversation: { teamId: "team-1" },
      senderPerson: null,
    });
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([]);

    await expect(
      acknowledgeTeamCommunication({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-1",
        actorUserId: "user-bystander",
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationForbiddenError);
  });

  it("computes engagement summary aggregates", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      status: "PUBLISHED",
      kind: "ANNOUNCEMENT",
      acknowledgementRequired: true,
      conversation: { teamId: "team-1" },
      senderPerson: null,
    });
    mocks.platformCommunicationRecipientSnapshot.groupBy.mockResolvedValue([
      { engagement: "PENDING", _count: { _all: 4 } },
      { engagement: "READ", _count: { _all: 10 } },
      { engagement: "ACKNOWLEDGED", _count: { _all: 4 } },
    ]);

    const summary = await getTeamCommunicationEngagementSummary({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-1",
    });

    expect(summary).toEqual({
      communicationId: "comm-1",
      recipientCount: 18,
      readCount: 14,
      acknowledgedCount: 4,
      unreadCount: 4,
      acknowledgementRequired: true,
    });
  });
});
