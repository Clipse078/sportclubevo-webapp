import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  _clearDomainAudienceRegistryForTests,
  getDomainAudienceSourceRegistry,
} from "@/lib/communication/platform/audience/domain-audience-registry";
import {
  getAuthorizedDomainAudienceSource,
  listAuthorizedDomainAudienceSources,
} from "@/lib/communication/platform/audience/domain-audience-discovery";
import {
  domainAudienceProvenanceLabel,
  materializeDomainAudiencesInSpec,
} from "@/lib/communication/platform/audience/domain-audience-expansion";
import { DomainAudienceError } from "@/lib/communication/platform/audience/domain-audience-errors";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";
import { listEventParticipationSubjectPersonIds } from "@/lib/communication/event/event-participation-recipients";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ensureEventsDomainAudienceRegistered } from "@/lib/events/domain-audience/register-events-domain-audience";
import {
  buildClubEventAudienceCandidateId,
  parseClubEventAudienceCandidateId,
  EVENTS_TEILNAHME_REGISTRY_KEY,
} from "@/lib/events/domain-audience/club-event-audience-candidates";
import {
  evaluateClubEventParticipationOperationalAttention,
  clubEventParticipationOutstandingAttentionSource,
} from "@/lib/events/operational-attention/club-event-participation-attention-source";
import { executeClubEventOutstandingParticipationReminder } from "@/lib/events/operational-attention/club-event-participation-reminder-action";
import { isClubEventRelevantForParticipationAttention } from "@/lib/events/domain-audience/club-event-relevance";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";
import { ensureTrainingDomainAudienceRegistered } from "@/lib/training/domain-audience/register-training-domain-audience";
import { TRAINING_TEILNAHME_REGISTRY_KEY } from "@/lib/training/domain-audience/training-audience-candidates";
import { ensureSpielbetriebDomainAudienceRegistered } from "@/lib/spielbetrieb/domain-audience/register-spielbetrieb-domain-audience";
import { SPIELBETRIEB_TEILNAHME_REGISTRY_KEY } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";

const mocks = vi.hoisted(() => ({
  event: { findFirst: vi.fn(), findMany: vi.fn() },
  teamSeason: { findFirst: vi.fn() },
  participationResponse: { findMany: vi.fn() },
  resolveClubEventInviteePersonIds: vi.fn(),
  getEffectivePermissions: vi.fn(),
  resolveClubCommunicationAuthorization: vi.fn(),
  resolveTeamCommunicationAuthorization: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  createClubCommunicationDraft: vi.fn(),
  publishClubCommunication: vi.fn(),
  communicationReminderExecution: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  tenant: { findFirst: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: mocks.event,
    teamSeason: mocks.teamSeason,
    participationResponse: mocks.participationResponse,
    tenant: mocks.tenant,
    communicationReminderExecution: mocks.communicationReminderExecution,
  },
}));

vi.mock("@/lib/events/club-event-participation-audience-service", () => ({
  resolveClubEventInviteePersonIds: (...args: unknown[]) =>
    mocks.resolveClubEventInviteePersonIds(...args),
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

vi.mock("@/lib/communication/club/club-communication-authorization", () => ({
  resolveClubCommunicationAuthorization: (...args: unknown[]) =>
    mocks.resolveClubCommunicationAuthorization(...args),
}));

vi.mock("@/lib/communication/team/team-communication-authorization", () => ({
  resolveTeamCommunicationAuthorization: (...args: unknown[]) =>
    mocks.resolveTeamCommunicationAuthorization(...args),
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: (...args: unknown[]) => mocks.createTeamCommunicationDraft(...args),
  publishTeamCommunication: (...args: unknown[]) => mocks.publishTeamCommunication(...args),
}));

vi.mock("@/lib/communication/club/club-communication-service", () => ({
  createClubCommunicationDraft: (...args: unknown[]) => mocks.createClubCommunicationDraft(...args),
  publishClubCommunication: (...args: unknown[]) => mocks.publishClubCommunication(...args),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: vi.fn(async () => ({ summary: { effectiveCount: 1 } })),
}));

const TENANT = "tenant-a";
const EVENT = "evt-club-1";

function candidateNotResponded() {
  return buildClubEventAudienceCandidateId({
    eventId: EVENT,
    preset: "NOT_RESPONDED",
  });
}

function defaultEventRow() {
  return {
    id: EVENT,
    title: "Helferabend",
    startAt: new Date("2026-10-10T18:00:00.000Z"),
    endAt: null,
    status: "SCHEDULED",
    type: "OTHER" as const,
    teamId: null,
    teamSeasonId: null,
    participationResponseDueAt: new Date("2026-10-09T18:00:00.000Z"),
  };
}

function defaultAnchor() {
  return {
    tenantId: TENANT,
    teamId: "",
    teamSeasonId: "",
    title: "Helferabend",
    startAt: new Date("2026-10-10T18:00:00.000Z"),
    participationEvent: { eventKind: "CLUB_EVENT" as const, eventId: EVENT },
    contextEventId: EVENT,
    anchorRef: {
      eventKind: "CLUB_EVENT" as const,
      eventId: EVENT,
      teamSeasonId: "",
      contextEventId: EVENT,
    },
  };
}

describe("SCE-EVENTS-AUDIENCE-01", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearDomainAudienceRegistryForTests();
    ensureEventsDomainAudienceRegistered();
    ensureTrainingDomainAudienceRegistered();
    ensureSpielbetriebDomainAudienceRegistered();
    mocks.tenant.findFirst.mockResolvedValue({ key: "demo" });
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p2", "p3"]);
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [
        PERMISSIONS.EVENTS_VIEW,
        PERMISSIONS.EVENTS_MANAGE,
        PERMISSIONS.COMMUNICATION_CLUB_SEND,
      ],
    });
    mocks.resolveClubCommunicationAuthorization.mockResolvedValue({
      canView: true,
      canSend: true,
    });
    mocks.event.findFirst.mockImplementation(async ({ where }: { where: { id?: string } }) => {
      if (where?.id === EVENT) return defaultEventRow();
      return null;
    });
    mocks.createClubCommunicationDraft.mockResolvedValue({ id: "club-comm-1" });
    mocks.publishClubCommunication.mockResolvedValue({ id: "club-comm-1", recipientCount: 2 });
    mocks.communicationReminderExecution.findUnique.mockResolvedValue(null);
    mocks.communicationReminderExecution.create.mockResolvedValue({ id: "exec-1" });
  });

  it("registers events teilnahme provider", () => {
    expect(getDomainAudienceSourceRegistry().get(EVENTS_TEILNAHME_REGISTRY_KEY)?.domainKey).toBe(
      "events",
    );
  });

  it("parses stable event-specific candidate identity", () => {
    const idA = buildClubEventAudienceCandidateId({ eventId: "e1", preset: "NOT_RESPONDED" });
    const idB = buildClubEventAudienceCandidateId({ eventId: "e2", preset: "NOT_RESPONDED" });
    expect(idA).not.toEqual(idB);
    expect(parseClubEventAudienceCandidateId(idA)?.eventId).toBe("e1");
    expect(parseClubEventAudienceCandidateId("malformed")).toBeNull();
    expect(
      parseClubEventAudienceCandidateId("v1:team:t:ts:ts:sess:s:kind:TRAINING:p:not-responded"),
    ).toBeNull();
  });

  it("authorized discovery lists events source with EVENTS_VIEW", async () => {
    const sources = await listAuthorizedDomainAudienceSources({
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
    });
    expect(sources.some((s) => s.key === EVENTS_TEILNAHME_REGISTRY_KEY)).toBe(true);
  });

  it("unauthorized discovery excludes events without EVENTS_VIEW", async () => {
    const source = await getAuthorizedDomainAudienceSource(
      {
        tenantId: TENANT,
        userId: "user-1",
        permissionKeys: new Set(),
      },
      EVENTS_TEILNAHME_REGISTRY_KEY,
    );
    expect(source).toBeNull();
  });

  it("uses club invitee population not squad for CLUB_EVENT anchor", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "OPEN" },
    ]);
    const anchor = defaultAnchor();
    expect(await listEventParticipationSubjectPersonIds({ anchor, preset: "NOT_RESPONDED" })).toEqual([
      "p2",
      "p3",
    ]);
    expect(mocks.resolveClubEventInviteePersonIds).toHaveBeenCalledWith(TENANT, EVENT);
  });

  it("materializes live NOT_RESPONDED domain audience", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    const spec = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: EVENTS_TEILNAHME_REGISTRY_KEY,
              candidateId: candidateNotResponded(),
            },
          },
        ],
      },
      {
        tenantId: TENANT,
        senderUserId: "user-1",
        discovery: {
          tenantId: TENANT,
          userId: "user-1",
          permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
        },
      },
    );
    expect(spec.components[0]?.explicit?.includePersonIds).toEqual(["p1", "p2", "p3"]);
  });

  it("attention omitted when participation request inactive", async () => {
    mocks.event.findMany.mockResolvedValue([
      { ...defaultEventRow(), participationResponseDueAt: null },
    ]);
    const items = await evaluateClubEventParticipationOperationalAttention({
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
      now: new Date("2026-10-01T12:00:00.000Z"),
    });
    expect(items).toHaveLength(0);
  });

  it("attention exists when outstanding > 0 and disappears at 0", async () => {
    mocks.event.findMany.mockResolvedValue([defaultEventRow()]);
    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "YES" }]);
    const ctx = {
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
      now: new Date("2026-10-01T12:00:00.000Z"),
    };
    const withOutstanding = await evaluateClubEventParticipationOperationalAttention(ctx);
    expect(withOutstanding).toHaveLength(1);
    expect(withOutstanding[0]?.count).toBe(2);

    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
      { personId: "p3", status: "YES" },
    ]);
    expect(await evaluateClubEventParticipationOperationalAttention(ctx)).toHaveLength(0);
  });

  it("TOCTOU — reminder sends current outstanding only (club comm path)", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    mocks.event.findMany.mockResolvedValue([defaultEventRow()]);
    const ctx = {
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
      now: new Date("2026-10-01T12:00:00.000Z"),
    };
    const items = await clubEventParticipationOutstandingAttentionSource.evaluateAttention(ctx);
    expect(items[0]?.count).toBe(3);

    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "YES" }]);
    await executeClubEventOutstandingParticipationReminder({
      tenantId: TENANT,
      userId: "user-1",
      candidateId: candidateNotResponded(),
      permissionKeys: new Set([
        PERMISSIONS.EVENTS_MANAGE,
        PERMISSIONS.COMMUNICATION_CLUB_SEND,
      ]),
    });

    expect(mocks.createClubCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceSpec: expect.objectContaining({
          components: [
            expect.objectContaining({
              explicit: { includePersonIds: ["p2", "p3"] },
            }),
          ],
        }),
      }),
    );
  });

  it("TOCTOU zero — all respond before action", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
      { personId: "p3", status: "YES" },
    ]);
    const result = await executeClubEventOutstandingParticipationReminder({
      tenantId: TENANT,
      userId: "user-1",
      candidateId: candidateNotResponded(),
      permissionKeys: new Set([
        PERMISSIONS.EVENTS_MANAGE,
        PERMISSIONS.COMMUNICATION_CLUB_SEND,
      ]),
    });
    expect(result.recipientCount).toBe(0);
    expect(mocks.createClubCommunicationDraft).not.toHaveBeenCalled();
  });

  it("cross-tenant event fails closed on materialization", async () => {
    mocks.event.findFirst.mockResolvedValue(null);
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: EVENTS_TEILNAHME_REGISTRY_KEY,
                candidateId: candidateNotResponded(),
              },
            },
          ],
        },
        {
          tenantId: "other-tenant",
          senderUserId: "user-1",
          discovery: {
            tenantId: "other-tenant",
            userId: "user-1",
            permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
          },
        },
      ),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });

  it("MATCH-shaped candidate kind rejected", async () => {
    const bad = "v1:evt:e1:kind:MATCH:p:not-responded";
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [{ domainAudience: { sourceKey: EVENTS_TEILNAHME_REGISTRY_KEY, candidateId: bad } }],
        },
        {
          tenantId: TENANT,
          senderUserId: "user-1",
          discovery: {
            tenantId: TENANT,
            userId: "user-1",
            permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
          },
        },
      ),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });

  it("uses COMM-10 team remind when club event has team scope", async () => {
    const teamScoped = {
      ...defaultEventRow(),
      teamId: "team-1",
      teamSeasonId: "ts-1",
    };
    mocks.event.findFirst.mockResolvedValue(teamScoped);
    mocks.teamSeason.findFirst.mockResolvedValue({ id: "ts-1", teamId: "team-1", seasonId: "s-1" });
    mocks.participationResponse.findMany.mockResolvedValue([]);
    mocks.resolveTeamCommunicationAuthorization.mockResolvedValue({ canView: true, canSend: true });
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "comm-1" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "comm-1", recipientCount: 3 });

    await executeClubEventOutstandingParticipationReminder({
      tenantId: TENANT,
      userId: "user-1",
      candidateId: candidateNotResponded(),
      permissionKeys: new Set([
        PERMISSIONS.EVENTS_MANAGE,
        PERMISSIONS.COMMUNICATION_CLUB_SEND,
      ]),
    });
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalled();
    expect(mocks.createClubCommunicationDraft).not.toHaveBeenCalled();
  });

  it("training and spielbetrieb registries unchanged", () => {
    expect(getDomainAudienceSourceRegistry().get(TRAINING_TEILNAHME_REGISTRY_KEY)).toBeTruthy();
    expect(getDomainAudienceSourceRegistry().get(SPIELBETRIEB_TEILNAHME_REGISTRY_KEY)).toBeTruthy();
  });

  it("activation signal is participationResponseDueAt != null", () => {
    expect(isParticipationResponseRequested({ participationResponseDueAt: null })).toBe(false);
    expect(
      isParticipationResponseRequested({ participationResponseDueAt: new Date("2026-10-01T00:00:00.000Z") }),
    ).toBe(true);
  });

  it("provenance label for events candidate", () => {
    expect(
      domainAudienceProvenanceLabel({
        reference: {
          sourceKey: EVENTS_TEILNAHME_REGISTRY_KEY,
          candidateId: candidateNotResponded(),
        },
      }),
    ).toContain("Rückmeldung ausstehend");
  });

  it("relevance excludes archived-style past events", () => {
    expect(
      isClubEventRelevantForParticipationAttention({
        type: "OTHER",
        status: "SCHEDULED",
        startAt: new Date("2026-09-01T10:00:00.000Z"),
        endAt: new Date("2026-09-01T12:00:00.000Z"),
        now: new Date("2026-10-01T12:00:00.000Z"),
        participationResponseDueAt: new Date("2026-08-30T00:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("TOCTOU — cancelled event does not send reminder", async () => {
    mocks.event.findFirst.mockResolvedValue({
      ...defaultEventRow(),
      status: "CANCELLED",
    });
    mocks.participationResponse.findMany.mockResolvedValue([]);
    await expect(
      executeClubEventOutstandingParticipationReminder({
        tenantId: TENANT,
        userId: "user-1",
        candidateId: candidateNotResponded(),
        permissionKeys: new Set([
          PERMISSIONS.EVENTS_MANAGE,
          PERMISSIONS.COMMUNICATION_CLUB_SEND,
        ]),
        now: new Date("2026-10-01T12:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationNotFoundError);
    expect(mocks.createClubCommunicationDraft).not.toHaveBeenCalled();
  });

  it("TOCTOU — participation request disabled does not send reminder", async () => {
    mocks.event.findFirst.mockResolvedValue({
      ...defaultEventRow(),
      participationResponseDueAt: null,
    });
    await expect(
      executeClubEventOutstandingParticipationReminder({
        tenantId: TENANT,
        userId: "user-1",
        candidateId: candidateNotResponded(),
        permissionKeys: new Set([
          PERMISSIONS.EVENTS_MANAGE,
          PERMISSIONS.COMMUNICATION_CLUB_SEND,
        ]),
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationNotFoundError);
  });

  it("TOCTOU — structural population change uses live invitees at execution", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p2", "p3", "p4", "p5", "p6"]);
    mocks.event.findMany.mockResolvedValue([defaultEventRow()]);
    const ctx = {
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
      now: new Date("2026-10-01T12:00:00.000Z"),
    };
    expect((await evaluateClubEventParticipationOperationalAttention(ctx))[0]?.count).toBe(6);

    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
    ]);
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p2", "p3", "p4"]);

    await executeClubEventOutstandingParticipationReminder({
      tenantId: TENANT,
      userId: "user-1",
      candidateId: candidateNotResponded(),
      permissionKeys: new Set([
        PERMISSIONS.EVENTS_MANAGE,
        PERMISSIONS.COMMUNICATION_CLUB_SEND,
      ]),
    });

    expect(mocks.createClubCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceSpec: expect.objectContaining({
          components: [
            expect.objectContaining({
              explicit: { includePersonIds: ["p3", "p4"] },
            }),
          ],
        }),
      }),
    );
  });

  it("materialization fails closed when participation request inactive", async () => {
    mocks.event.findFirst.mockResolvedValue({
      ...defaultEventRow(),
      participationResponseDueAt: null,
    });
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: EVENTS_TEILNAHME_REGISTRY_KEY,
                candidateId: candidateNotResponded(),
              },
            },
          ],
        },
        {
          tenantId: TENANT,
          senderUserId: "user-1",
          discovery: {
            tenantId: TENANT,
            userId: "user-1",
            permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW]),
          },
        },
      ),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });

  it("events.view alone cannot send reminder (manage + club send required)", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    await expect(
      executeClubEventOutstandingParticipationReminder({
        tenantId: TENANT,
        userId: "user-1",
        candidateId: candidateNotResponded(),
        permissionKeys: new Set([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.COMMUNICATION_CLUB_SEND]),
      }),
    ).rejects.toThrow();
    expect(mocks.createClubCommunicationDraft).not.toHaveBeenCalled();
  });
});
