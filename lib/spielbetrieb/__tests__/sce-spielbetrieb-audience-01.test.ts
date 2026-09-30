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
import { listEventParticipationSubjectPersonIds } from "@/lib/communication/event/event-participation-recipients";
import { sendEventNoResponseSmartReminder } from "@/lib/communication/event/event-communication-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ensureSpielbetriebDomainAudienceRegistered } from "@/lib/spielbetrieb/domain-audience/register-spielbetrieb-domain-audience";
import {
  buildSpielbetriebAudienceCandidateId,
  parseSpielbetriebAudienceCandidateId,
  SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import {
  evaluateSpielbetriebParticipationOperationalAttention,
  spielbetriebParticipationOutstandingAttentionSource,
} from "@/lib/spielbetrieb/operational-attention/spielbetrieb-participation-attention-source";
import { executeSpielbetriebOutstandingParticipationReminder } from "@/lib/spielbetrieb/operational-attention/spielbetrieb-participation-reminder-action";
import { ensureProbetrainingDomainAudienceRegistered } from "@/lib/registrations/domain-audience/register-probetraining-domain-audience";
import { PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY } from "@/lib/registrations/domain-audience/probetraining-audience-candidates";

const mocks = vi.hoisted(() => ({
  teamSeason: { findFirst: vi.fn() },
  trainingSession: { findFirst: vi.fn() },
  event: { findFirst: vi.fn(), findMany: vi.fn() },
  playerSquadMember: { findMany: vi.fn() },
  participationResponse: { findMany: vi.fn() },
  team: { findMany: vi.fn(), findFirst: vi.fn() },
  tenant: { findFirst: vi.fn() },
  resolveTeamCommunicationAuthorization: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  communicationReminderExecution: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  resolveClubEventInviteePersonIds: vi.fn(),
  getEffectivePermissions: vi.fn(),
  loadGuardianExpansionsForSubjects: vi.fn(),
  guardianRelationship: { findMany: vi.fn() },
  person: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    teamSeason: mocks.teamSeason,
    trainingSession: mocks.trainingSession,
    event: mocks.event,
    playerSquadMember: mocks.playerSquadMember,
    participationResponse: mocks.participationResponse,
    team: mocks.team,
    tenant: mocks.tenant,
    communicationReminderExecution: mocks.communicationReminderExecution,
    guardianRelationship: mocks.guardianRelationship,
    person: mocks.person,
  },
}));

vi.mock("@/lib/events/club-event-participation-audience-service", () => ({
  resolveClubEventInviteePersonIds: (...args: unknown[]) =>
    mocks.resolveClubEventInviteePersonIds(...args),
}));

vi.mock("@/lib/communication/team/team-communication-authorization", () => ({
  resolveTeamCommunicationAuthorization: (...args: unknown[]) =>
    mocks.resolveTeamCommunicationAuthorization(...args),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: (...args: unknown[]) => mocks.resolveCommunicationRecipients(...args),
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: (...args: unknown[]) => mocks.createTeamCommunicationDraft(...args),
  publishTeamCommunication: (...args: unknown[]) => mocks.publishTeamCommunication(...args),
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/guardian-expansion", () => ({
  loadGuardianExpansionsForSubjects: (...args: unknown[]) =>
    mocks.loadGuardianExpansionsForSubjects(...args),
  createGuardianExpansionPortForTenant: vi.fn(async () => ({
    expandSubjectsToDeliveryTargets: vi.fn(async ({ subjectPersonIds }: { subjectPersonIds: string[] }) =>
      subjectPersonIds.map((id) => ({
        subjectPersonId: id,
        deliveryUserId: `user-${id}`,
        channel: "EMAIL",
        viaGuardianSubstitution: id.startsWith("child"),
        safeguardingReasonCode: id.startsWith("child") ? "GUARDIAN_SUBSTITUTION" : null,
        guardianPersonId: id.startsWith("child") ? `guardian-${id}` : null,
      })),
    ),
  })),
}));

const TENANT = "tenant-a";
const TEAM = "team-1";
const TS = "ts-1";
const EVENT = "event-match-1";

function candidateNotResponded() {
  return buildSpielbetriebAudienceCandidateId({
    teamId: TEAM,
    teamSeasonId: TS,
    eventId: EVENT,
    eventKind: "MATCH",
    preset: "NOT_RESPONDED",
  });
}

function defaultAnchor() {
  return {
    tenantId: TENANT,
    teamId: TEAM,
    teamSeasonId: TS,
    title: "Heimspiel",
    startAt: new Date("2026-10-05T14:00:00.000Z"),
    participationEvent: { eventKind: "MATCH" as const, eventId: EVENT },
    contextEventId: EVENT,
    anchorRef: {
      eventKind: "MATCH" as const,
      eventId: EVENT,
      teamSeasonId: TS,
      contextEventId: EVENT,
    },
  };
}

function setupEventAndSquad() {
  mocks.tenant.findFirst.mockResolvedValue({ key: "fca" });
  mocks.teamSeason.findFirst.mockResolvedValue({ id: TS, teamId: TEAM, seasonId: "season-1" });
  mocks.event.findFirst.mockResolvedValue({
    id: EVENT,
    title: "Heimspiel",
    startAt: new Date("2026-10-05T14:00:00.000Z"),
    status: "SCHEDULED",
    type: "MATCH",
    teamId: TEAM,
    participationResponseDueAt: new Date("2026-10-04T18:00:00.000Z"),
    team: { name: "F2" },
  });
  mocks.playerSquadMember.findMany.mockResolvedValue([
    { personId: "p1" },
    { personId: "p2" },
    { personId: "p3" },
  ]);
}

describe("SCE-SPIELBETRIEB-AUDIENCE-01", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearDomainAudienceRegistryForTests();
    ensureSpielbetriebDomainAudienceRegistered();
    ensureProbetrainingDomainAudienceRegistered();
    mocks.resolveTeamCommunicationAuthorization.mockResolvedValue({
      canView: true,
      canSend: true,
    });
    mocks.team.findMany.mockResolvedValue([{ id: TEAM }]);
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_TEAM_VIEW, PERMISSIONS.COMMUNICATION_TEAM_SEND],
    });
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "comm-1" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "comm-1", recipientCount: 2 });
    mocks.communicationReminderExecution.findUnique.mockResolvedValue(null);
    mocks.communicationReminderExecution.create.mockResolvedValue({ id: "exec-1" });
    setupEventAndSquad();
  });

  it("registers spielbetrieb teilnahme provider", () => {
    expect(getDomainAudienceSourceRegistry().get(SPIELBETRIEB_TEILNAHME_REGISTRY_KEY)?.domainKey).toBe(
      "spielbetrieb",
    );
  });

  it("parses stable event-specific candidate identity", () => {
    const idA = buildSpielbetriebAudienceCandidateId({
      teamId: TEAM,
      teamSeasonId: TS,
      eventId: "ev-a",
      eventKind: "MATCH",
      preset: "NOT_RESPONDED",
    });
    const idB = buildSpielbetriebAudienceCandidateId({
      teamId: TEAM,
      teamSeasonId: TS,
      eventId: "ev-b",
      eventKind: "MATCH",
      preset: "NOT_RESPONDED",
    });
    expect(idA).not.toEqual(idB);
    expect(parseSpielbetriebAudienceCandidateId(idA)?.eventId).toBe("ev-a");
    expect(parseSpielbetriebAudienceCandidateId("malformed")).toBeNull();
  });

  it("authorized discovery lists spielbetrieb source", async () => {
    const sources = await listAuthorizedDomainAudienceSources({
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
    });
    expect(sources.some((s) => s.key === SPIELBETRIEB_TEILNAHME_REGISTRY_KEY)).toBe(true);
  });

  it("unauthorized discovery excludes spielbetrieb when no team view", async () => {
    mocks.resolveTeamCommunicationAuthorization.mockResolvedValue({ canView: false, canSend: false });
    mocks.team.findMany.mockResolvedValue([{ id: TEAM }]);
    const source = await getAuthorizedDomainAudienceSource(
      {
        tenantId: TENANT,
        userId: "user-1",
        permissionKeys: new Set(),
      },
      SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
    );
    expect(source).toBeNull();
  });

  it("maps all participation presets via shared core", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "NO" },
      { personId: "p3", status: "MAYBE" },
    ]);
    const anchor = defaultAnchor();
    expect(await listEventParticipationSubjectPersonIds({ anchor, preset: "ALL_INVITEES" })).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
    expect(await listEventParticipationSubjectPersonIds({ anchor, preset: "ACCEPTED_ONLY" })).toEqual([
      "p1",
    ]);
    expect(await listEventParticipationSubjectPersonIds({ anchor, preset: "DECLINED_ONLY" })).toEqual([
      "p2",
    ]);
    expect(await listEventParticipationSubjectPersonIds({ anchor, preset: "NOT_RESPONDED" })).toEqual(
      [],
    );
  });

  it("materializes live NOT_RESPONDED domain audience", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    const candidateId = candidateNotResponded();
    const spec = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
              candidateId,
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
          permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
        },
      },
    );
    expect(spec.components[0]?.explicit?.includePersonIds).toEqual(["p1", "p2", "p3"]);
  });

  it("attention omitted when participation request is not active (no due date)", async () => {
    mocks.event.findMany.mockResolvedValue([
      {
        id: EVENT,
        title: "Sonntag",
        startAt: new Date("2026-10-05T14:00:00.000Z"),
        type: "MATCH",
        status: "SCHEDULED",
        teamId: TEAM,
        teamSeasonId: TS,
        participationResponseDueAt: null,
        team: { name: "F2" },
      },
    ]);
    mocks.participationResponse.findMany.mockResolvedValue([]);
    const ctx = {
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
      now: new Date("2026-10-01T12:00:00.000Z"),
    };
    const items = await evaluateSpielbetriebParticipationOperationalAttention(ctx);
    expect(items).toHaveLength(0);
  });

  it("attention exists when outstanding > 0 and disappears at 0", async () => {
    mocks.event.findMany.mockResolvedValue([
      {
        id: EVENT,
        title: "Sonntag",
        startAt: new Date("2026-10-05T14:00:00.000Z"),
        type: "MATCH",
        status: "SCHEDULED",
        teamId: TEAM,
        teamSeasonId: TS,
        participationResponseDueAt: new Date("2026-10-04T18:00:00.000Z"),
        team: { name: "F2" },
      },
    ]);
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
    ]);
    const ctx = {
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
      now: new Date("2026-10-01T12:00:00.000Z"),
    };
    const withOutstanding = await evaluateSpielbetriebParticipationOperationalAttention(ctx);
    expect(withOutstanding).toHaveLength(1);
    expect(withOutstanding[0]?.count).toBe(1);

    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
      { personId: "p3", status: "YES" },
    ]);
    const none = await evaluateSpielbetriebParticipationOperationalAttention(ctx);
    expect(none).toHaveLength(0);
  });

  it("TOCTOU — displayed 3 but execution sends only current 2 outstanding", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    const ctx = {
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
      now: new Date("2026-10-01T12:00:00.000Z"),
    };
    mocks.event.findMany.mockResolvedValue([
      {
        id: EVENT,
        title: "Sonntag",
        startAt: new Date("2026-10-05T14:00:00.000Z"),
        type: "MATCH",
        status: "SCHEDULED",
        teamId: TEAM,
        teamSeasonId: TS,
        participationResponseDueAt: new Date("2026-10-04T18:00:00.000Z"),
        team: { name: "F2" },
      },
    ]);
    const items = await spielbetriebParticipationOutstandingAttentionSource.evaluateAttention(ctx);
    expect(items[0]?.count).toBe(3);

    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "YES" }]);

    await executeSpielbetriebOutstandingParticipationReminder({
      tenantId: TENANT,
      userId: "user-1",
      candidateId: candidateNotResponded(),
    });

    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
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

  it("TOCTOU zero case — all respond before action", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
      { personId: "p3", status: "YES" },
    ]);
    const result = await executeSpielbetriebOutstandingParticipationReminder({
      tenantId: TENANT,
      userId: "user-1",
      candidateId: candidateNotResponded(),
    });
    expect(result.recipientCount).toBe(0);
    expect(result.communicationId).toBeNull();
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
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
                sourceKey: SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
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
            permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
          },
        },
      ),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });

  it("probetraining regression — registry still contains probetraining", () => {
    expect(getDomainAudienceSourceRegistry().get(PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY)).toBeTruthy();
  });

  it("provenance label for spielbetrieb candidate", () => {
    expect(domainAudienceProvenanceLabel({
      reference: {
        sourceKey: SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
        candidateId: candidateNotResponded(),
      },
    })).toContain("Rückmeldung ausstehend");
  });

  it("cancelled event fails closed for reminder action", async () => {
    mocks.event.findFirst.mockResolvedValue({
      id: EVENT,
      title: "Heimspiel",
      startAt: new Date("2026-10-05T14:00:00.000Z"),
      status: "CANCELLED",
      type: "MATCH",
      teamId: TEAM,
      participationResponseDueAt: new Date("2026-10-04T18:00:00.000Z"),
    });
    await expect(
      executeSpielbetriebOutstandingParticipationReminder({
        tenantId: TENANT,
        userId: "user-1",
        candidateId: candidateNotResponded(),
      }),
    ).rejects.toThrow(/no longer actionable|not found/i);
  });

  it("permission loss blocks reminder send", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    mocks.resolveTeamCommunicationAuthorization
      .mockResolvedValueOnce({ canView: true, canSend: true })
      .mockResolvedValueOnce({ canView: true, canSend: false });
    await expect(
      executeSpielbetriebOutstandingParticipationReminder({
        tenantId: TENANT,
        userId: "user-1",
        candidateId: candidateNotResponded(),
      }),
    ).rejects.toThrow();
  });

  it("guardian substitution applies via COMM-03 path for youth subjects", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    mocks.playerSquadMember.findMany.mockResolvedValue([{ personId: "child-1" }]);
    mocks.resolveCommunicationRecipients.mockResolvedValue({
      summary: { effectiveCount: 1 },
      recipients: [
        {
          subjectPersonId: "child-1",
          deliveryUserId: "guardian-user",
          viaGuardianSubstitution: true,
        },
      ],
    });
    const candidateId = buildSpielbetriebAudienceCandidateId({
      teamId: TEAM,
      teamSeasonId: TS,
      eventId: EVENT,
      eventKind: "MATCH",
      preset: "NOT_RESPONDED",
    });
    const spec = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [{ domainAudience: { sourceKey: SPIELBETRIEB_TEILNAHME_REGISTRY_KEY, candidateId } }],
      },
      {
        tenantId: TENANT,
        senderUserId: "user-1",
        discovery: {
          tenantId: TENANT,
          userId: "user-1",
          permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
        },
      },
    );
    expect(spec.components[0]?.explicit?.includePersonIds).toEqual(["child-1"]);
  });

  it("COMM-10 remind path unchanged contract for non-zero outstanding", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "YES" }]);
    await sendEventNoResponseSmartReminder({
      tenantId: TENANT,
      teamId: TEAM,
      teamSeasonId: TS,
      event: { eventKind: "MATCH", eventId: EVENT },
      senderUserId: "user-1",
      viewerCanSend: true,
    });
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalled();
  });
});
