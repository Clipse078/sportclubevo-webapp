import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDomainOperationalAttentionId } from "../source-identity";
import { SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY } from "@/lib/spielbetrieb/operational-attention/spielbetrieb-participation-attention-source";

const mocks = vi.hoisted(() => ({
  loadDomainOperationalAttention: vi.fn(),
  getRequestEffectivePermissions: vi.fn(),
  executeSpielbetriebOutstandingParticipationReminder: vi.fn(),
  executeTrainingOutstandingParticipationReminder: vi.fn(),
  executeClubEventOutstandingParticipationReminder: vi.fn(),
}));

vi.mock("../load-domain-operational-attention", () => ({
  loadDomainOperationalAttention: mocks.loadDomainOperationalAttention,
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));

vi.mock(
  "@/lib/spielbetrieb/operational-attention/spielbetrieb-participation-reminder-action",
  () => ({
    executeSpielbetriebOutstandingParticipationReminder:
      mocks.executeSpielbetriebOutstandingParticipationReminder,
  }),
);

vi.mock("@/lib/training/operational-attention/training-participation-reminder-action", () => ({
  executeTrainingOutstandingParticipationReminder:
    mocks.executeTrainingOutstandingParticipationReminder,
}));

vi.mock("@/lib/events/operational-attention/club-event-participation-reminder-action", () => ({
  executeClubEventOutstandingParticipationReminder:
    mocks.executeClubEventOutstandingParticipationReminder,
}));

import {
  DomainOperationalAttentionActionNotFoundError,
  DomainOperationalAttentionItemNotFoundError,
  executeDomainOperationalAttentionAction,
} from "../execute-operational-attention-action";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const attentionId = buildDomainOperationalAttentionId({
  domainKey: "spielbetrieb",
  attentionKind: "participation-outstanding",
  contextEntityType: "event",
  contextEntityId: "evt-1",
});

function authorizedItem() {
  return {
    id: attentionId,
    tenantId: "tenant-a",
    domainKey: "spielbetrieb",
    attentionKind: "participation-outstanding",
    contextEntityType: "event",
    contextEntityId: "evt-1",
    title: "Test",
    summary: null,
    severity: "info" as const,
    count: 2,
    dueAt: null,
    deepLink: "/",
    actions: [
      {
        actionKey: SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY,
        label: "Erinnerung senden",
        executionKind: "COMMUNICATION_SEND" as const,
        requiredPermissions: [
          PERMISSIONS.COMMUNICATION_TEAM_VIEW,
          PERMISSIONS.COMMUNICATION_TEAM_SEND,
        ],
        domainAudience: {
          sourceKey: "spielbetrieb.teilnahme",
          candidateId: "cand-1",
        },
      },
    ],
  };
}

describe("SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — execute action security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_TEAM_VIEW, PERMISSIONS.COMMUNICATION_TEAM_SEND],
    });
    mocks.loadDomainOperationalAttention.mockResolvedValue({
      items: [authorizedItem()],
      failedSourceKeys: [],
    });
    mocks.executeSpielbetriebOutstandingParticipationReminder.mockResolvedValue({
      recipientCount: 2,
      resolvedOutstandingCount: 2,
      duplicate: false,
    });
  });

  it("dispatches when item is currently authorized", async () => {
    const result = await executeDomainOperationalAttentionAction({
      tenantId: "tenant-a",
      userId: "user-1",
      attentionId,
      actionKey: SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY,
    });
    expect(result.recipientCount).toBe(2);
    expect(mocks.executeSpielbetriebOutstandingParticipationReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a",
        userId: "user-1",
        candidateId: "cand-1",
      }),
    );
  });

  it("rejects fabricated attention id format", async () => {
    await expect(
      executeDomainOperationalAttentionAction({
        tenantId: "tenant-a",
        userId: "user-1",
        attentionId: "domain-attn:spielbetrieb:fake:evt-1",
        actionKey: SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY,
      }),
    ).rejects.toBeInstanceOf(DomainOperationalAttentionItemNotFoundError);
  });

  it("rejects item not in current authorized load (foreign tenant context)", async () => {
    mocks.loadDomainOperationalAttention.mockResolvedValue({ items: [], failedSourceKeys: [] });
    await expect(
      executeDomainOperationalAttentionAction({
        tenantId: "tenant-b",
        userId: "user-1",
        attentionId,
        actionKey: SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY,
      }),
    ).rejects.toBeInstanceOf(DomainOperationalAttentionItemNotFoundError);
    expect(mocks.loadDomainOperationalAttention).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-b" }),
    );
  });

  it("rejects tampered action key", async () => {
    await expect(
      executeDomainOperationalAttentionAction({
        tenantId: "tenant-a",
        userId: "user-1",
        attentionId,
        actionKey: "spielbetrieb.participation.evil-action",
      }),
    ).rejects.toBeInstanceOf(DomainOperationalAttentionActionNotFoundError);
  });

  it("rejects when permission lost after dashboard render", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_TEAM_VIEW],
    });
    await expect(
      executeDomainOperationalAttentionAction({
        tenantId: "tenant-a",
        userId: "user-1",
        attentionId,
        actionKey: SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY,
      }),
    ).rejects.toBeInstanceOf(DomainOperationalAttentionItemNotFoundError);
  });

  it("rejects direct POST when item no longer discoverable", async () => {
    mocks.loadDomainOperationalAttention.mockResolvedValue({ items: [], failedSourceKeys: [] });
    await expect(
      executeDomainOperationalAttentionAction({
        tenantId: "tenant-a",
        userId: "user-1",
        attentionId,
        actionKey: SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY,
      }),
    ).rejects.toBeInstanceOf(DomainOperationalAttentionItemNotFoundError);
  });
});
