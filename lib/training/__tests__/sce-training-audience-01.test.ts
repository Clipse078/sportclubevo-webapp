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
import { SPIELBETRIEB_TEILNAHME_REGISTRY_KEY } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import { ensureProbetrainingDomainAudienceRegistered } from "@/lib/registrations/domain-audience/register-probetraining-domain-audience";
import { PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY } from "@/lib/registrations/domain-audience/probetraining-audience-candidates";
import { ensureTrainingDomainAudienceRegistered } from "@/lib/training/domain-audience/register-training-domain-audience";
import {
  buildTrainingAudienceCandidateId,
  parseTrainingAudienceCandidateId,
  TRAINING_TEILNAHME_REGISTRY_KEY,
} from "@/lib/training/domain-audience/training-audience-candidates";
import {
  evaluateTrainingParticipationOperationalAttention,
  trainingParticipationOutstandingAttentionSource,
} from "@/lib/training/operational-attention/training-participation-attention-source";
import { executeTrainingOutstandingParticipationReminder } from "@/lib/training/operational-attention/training-participation-reminder-action";
import {
  isTrainingSessionRelevantForParticipationAttention,
  trainingSessionEffectiveStartAt,
} from "@/lib/training/domain-audience/training-session-relevance";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";

const mocks = vi.hoisted(() => ({
  teamSeason: { findFirst: vi.fn() },
  trainingSession: { findFirst: vi.fn(), findMany: vi.fn() },
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
const SESSION = "tsess-1";

function candidateNotResponded() {
  return buildTrainingAudienceCandidateId({
    teamId: TEAM,
    teamSeasonId: TS,
    trainingSessionId: SESSION,
    preset: "NOT_RESPONDED",
  });
}

function defaultAnchor() {
  return {
    tenantId: TENANT,
    teamId: TEAM,
    teamSeasonId: TS,
    title: "Mittwochstraining",
    startAt: new Date("2026-10-07T13:45:00.000Z"),
    participationEvent: { eventKind: "TRAINING" as const, trainingSessionId: SESSION },
    contextEventId: SESSION,
    anchorRef: {
      eventKind: "TRAINING" as const,
      trainingSessionId: SESSION,
      teamSeasonId: TS,
      contextEventId: SESSION,
    },
  };
}

function defaultSessionRow() {
  return {
    id: SESSION,
    startAt: new Date("2026-10-07T13:45:00.000Z"),
    overrideStartAt: null,
    status: "SCHEDULED",
    teamSeasonId: TS,
    participationResponseDueAt: new Date("2026-10-06T18:00:00.000Z"),
    trainingSeries: { title: "Mittwochstraining" },
    teamSeason: { teamId: TEAM, team: { name: "F2" } },
  };
}

function setupSessionAndSquad() {
  mocks.tenant.findFirst.mockResolvedValue({ key: "fca" });
  mocks.teamSeason.findFirst.mockResolvedValue({ id: TS, teamId: TEAM, seasonId: "season-1" });
  mocks.trainingSession.findFirst.mockResolvedValue(defaultSessionRow());
  mocks.playerSquadMember.findMany.mockResolvedValue([
    { personId: "p1" },
    { personId: "p2" },
    { personId: "p3" },
  ]);
}

describe("SCE-TRAINING-AUDIENCE-01", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearDomainAudienceRegistryForTests();
    ensureTrainingDomainAudienceRegistered();
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
    setupSessionAndSquad();
  });

  it("registers training teilnahme provider", () => {
    expect(getDomainAudienceSourceRegistry().get(TRAINING_TEILNAHME_REGISTRY_KEY)?.domainKey).toBe(
      "training",
    );
  });

  it("parses stable session-specific candidate identity", () => {
    const idA = buildTrainingAudienceCandidateId({
      teamId: TEAM,
      teamSeasonId: TS,
      trainingSessionId: "sess-a",
      preset: "NOT_RESPONDED",
    });
    const idB = buildTrainingAudienceCandidateId({
      teamId: TEAM,
      teamSeasonId: TS,
      trainingSessionId: "sess-b",
      preset: "NOT_RESPONDED",
    });
    expect(idA).not.toEqual(idB);
    expect(parseTrainingAudienceCandidateId(idA)?.trainingSessionId).toBe("sess-a");
    expect(parseTrainingAudienceCandidateId("malformed")).toBeNull();
    expect(
      parseTrainingAudienceCandidateId(
        "v1:team:t:ts:ts:ev:e:kind:MATCH:p:not-responded",
      ),
    ).toBeNull();
  });

  it("authorized discovery lists training source", async () => {
    const sources = await listAuthorizedDomainAudienceSources({
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
    });
    expect(sources.some((s) => s.key === TRAINING_TEILNAHME_REGISTRY_KEY)).toBe(true);
  });

  it("unauthorized discovery excludes training when no team view", async () => {
    mocks.resolveTeamCommunicationAuthorization.mockResolvedValue({ canView: false, canSend: false });
    mocks.team.findMany.mockResolvedValue([{ id: TEAM }]);
    const source = await getAuthorizedDomainAudienceSource(
      {
        tenantId: TENANT,
        userId: "user-1",
        permissionKeys: new Set(),
      },
      TRAINING_TEILNAHME_REGISTRY_KEY,
    );
    expect(source).toBeNull();
  });

  it("maps all participation presets via shared core for TRAINING anchor", async () => {
    mocks.trainingSession.findFirst.mockResolvedValue({
      id: SESSION,
      startAt: new Date("2026-10-07T13:45:00.000Z"),
      trainingSeries: { title: "Mittwochstraining" },
    });
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
    expect(await listEventParticipationSubjectPersonIds({ anchor, preset: "MAYBE_ONLY" })).toEqual([
      "p3",
    ]);
    expect(await listEventParticipationSubjectPersonIds({ anchor, preset: "NOT_RESPONDED" })).toEqual(
      [],
    );
  });

  it("OPEN and missing row count as NOT_RESPONDED when request active", async () => {
    mocks.trainingSession.findFirst.mockResolvedValue({
      id: SESSION,
      startAt: new Date("2026-10-07T13:45:00.000Z"),
      trainingSeries: { title: "Mittwochstraining" },
    });
    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "OPEN" }]);
    const anchor = defaultAnchor();
    expect(await listEventParticipationSubjectPersonIds({ anchor, preset: "NOT_RESPONDED" })).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
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
              sourceKey: TRAINING_TEILNAHME_REGISTRY_KEY,
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
    mocks.trainingSession.findMany.mockResolvedValue([
      {
        ...defaultSessionRow(),
        participationResponseDueAt: null,
      },
    ]);
    mocks.participationResponse.findMany.mockResolvedValue([]);
    const ctx = {
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: new Set([PERMISSIONS.COMMUNICATION_TEAM_VIEW]),
      now: new Date("2026-10-01T12:00:00.000Z"),
    };
    const items = await evaluateTrainingParticipationOperationalAttention(ctx);
    expect(items).toHaveLength(0);
  });

  it("attention exists when outstanding > 0 and disappears at 0", async () => {
    mocks.trainingSession.findMany.mockResolvedValue([defaultSessionRow()]);
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
    const withOutstanding = await evaluateTrainingParticipationOperationalAttention(ctx);
    expect(withOutstanding).toHaveLength(1);
    expect(withOutstanding[0]?.count).toBe(1);

    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
      { personId: "p3", status: "YES" },
    ]);
    const none = await evaluateTrainingParticipationOperationalAttention(ctx);
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
    mocks.trainingSession.findMany.mockResolvedValue([defaultSessionRow()]);
    const items = await trainingParticipationOutstandingAttentionSource.evaluateAttention(ctx);
    expect(items[0]?.count).toBe(3);

    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "YES" }]);

    await executeTrainingOutstandingParticipationReminder({
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
    const result = await executeTrainingOutstandingParticipationReminder({
      tenantId: TENANT,
      userId: "user-1",
      candidateId: candidateNotResponded(),
    });
    expect(result.recipientCount).toBe(0);
    expect(result.communicationId).toBeNull();
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
  });

  it("cross-tenant session fails closed on materialization", async () => {
    mocks.trainingSession.findFirst.mockResolvedValue(null);
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: TRAINING_TEILNAHME_REGISTRY_KEY,
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

  it("wrong team in candidate fails closed", async () => {
    mocks.trainingSession.findFirst.mockResolvedValue(null);
    const wrongTeam = buildTrainingAudienceCandidateId({
      teamId: "wrong-team",
      teamSeasonId: TS,
      trainingSessionId: SESSION,
      preset: "NOT_RESPONDED",
    });
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [{ domainAudience: { sourceKey: TRAINING_TEILNAHME_REGISTRY_KEY, candidateId: wrongTeam } }],
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
      ),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });

  it("cancelled session fails closed for reminder action", async () => {
    mocks.trainingSession.findFirst.mockResolvedValue({
      ...defaultSessionRow(),
      status: "CANCELLED",
    });
    await expect(
      executeTrainingOutstandingParticipationReminder({
        tenantId: TENANT,
        userId: "user-1",
        candidateId: candidateNotResponded(),
      }),
    ).rejects.toThrow(/no longer actionable|not found/i);
  });

  it("completed (past start) session fails closed for materialization", async () => {
    mocks.trainingSession.findFirst.mockResolvedValue({
      ...defaultSessionRow(),
      startAt: new Date("2026-09-01T13:45:00.000Z"),
    });
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            { domainAudience: { sourceKey: TRAINING_TEILNAHME_REGISTRY_KEY, candidateId: candidateNotResponded() } },
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
      ),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });

  it("permission loss blocks reminder send", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([]);
    mocks.resolveTeamCommunicationAuthorization
      .mockResolvedValueOnce({ canView: true, canSend: true })
      .mockResolvedValueOnce({ canView: true, canSend: false });
    await expect(
      executeTrainingOutstandingParticipationReminder({
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
    const candidateId = buildTrainingAudienceCandidateId({
      teamId: TEAM,
      teamSeasonId: TS,
      trainingSessionId: SESSION,
      preset: "NOT_RESPONDED",
    });
    const spec = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [{ domainAudience: { sourceKey: TRAINING_TEILNAHME_REGISTRY_KEY, candidateId } }],
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

  it("provenance label for training candidate", () => {
    expect(
      domainAudienceProvenanceLabel({
        reference: {
          sourceKey: TRAINING_TEILNAHME_REGISTRY_KEY,
          candidateId: candidateNotResponded(),
        },
      }),
    ).toContain("Rückmeldung ausstehend");
  });

  it("spielbetrieb regression — registry still contains spielbetrieb", () => {
    expect(getDomainAudienceSourceRegistry().get(SPIELBETRIEB_TEILNAHME_REGISTRY_KEY)).toBeTruthy();
  });

  it("probetraining regression — registry still contains probetraining", () => {
    expect(getDomainAudienceSourceRegistry().get(PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY)).toBeTruthy();
  });

  it("COMM-10 remind path for TRAINING unchanged contract", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "YES" }]);
    mocks.trainingSession.findFirst.mockResolvedValue({
      id: SESSION,
      startAt: new Date("2026-10-07T13:45:00.000Z"),
      trainingSeries: { title: "Mittwochstraining" },
    });
    await sendEventNoResponseSmartReminder({
      tenantId: TENANT,
      teamId: TEAM,
      teamSeasonId: TS,
      event: { eventKind: "TRAINING", trainingSessionId: SESSION },
      senderUserId: "user-1",
      viewerCanSend: true,
    });
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalled();
  });

  it("activation signal reuses isParticipationResponseRequested", () => {
    expect(isParticipationResponseRequested({ participationResponseDueAt: null })).toBe(false);
    expect(
      isParticipationResponseRequested({ participationResponseDueAt: new Date("2026-10-01T00:00:00.000Z") }),
    ).toBe(true);
  });

  it("relevance uses effective override start", () => {
    const now = new Date("2026-10-07T12:00:00.000Z");
    expect(
      isTrainingSessionRelevantForParticipationAttention({
        status: "SCHEDULED",
        startAt: new Date("2026-10-07T11:00:00.000Z"),
        overrideStartAt: new Date("2026-10-07T14:00:00.000Z"),
        now,
        participationResponseDueAt: new Date("2026-10-06T18:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      trainingSessionEffectiveStartAt({
        startAt: new Date("2026-10-07T11:00:00.000Z"),
        overrideStartAt: new Date("2026-10-07T14:00:00.000Z"),
      }).getTime(),
    ).toBe(new Date("2026-10-07T14:00:00.000Z").getTime());
  });
});
