import { describe, expect, it, beforeEach, vi } from "vitest";
import { RegistrationStatus } from "@prisma/client";
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
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import {
  buildZielgruppeRuleDocumentV2,
  parseTargetGroupRuleJson,
} from "@/lib/communication/zielgruppen/rule-document";
import { resolveAudienceCandidates } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ensureProbetrainingDomainAudienceRegistered } from "@/lib/registrations/domain-audience/register-probetraining-domain-audience";
import {
  PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
  probetrainingAudienceProvenanceLabel,
} from "@/lib/registrations/domain-audience/probetraining-audience-candidates";
import { materializeProbetrainingRegistrationsToAudienceComponent } from "@/lib/registrations/domain-audience/probetraining-recipient-materialization";

const mocks = vi.hoisted(() => ({
  registration: { findMany: vi.fn() },
  communicationExternalContact: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  person: { findMany: vi.fn() },
  targetGroup: { findUnique: vi.fn() },
  user: { findMany: vi.fn() },
  tenantMembership: { findMany: vi.fn() },
  orgUnit: { findMany: vi.fn() },
  team: { findMany: vi.fn() },
  role: { findMany: vi.fn() },
  guardianRelationship: { findMany: vi.fn() },
  getEffectivePermissions: vi.fn(),
  loadTenantCommunicationSafeguardingPolicy: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    registration: mocks.registration,
    communicationExternalContact: mocks.communicationExternalContact,
    person: mocks.person,
    targetGroup: mocks.targetGroup,
    user: mocks.user,
    tenantMembership: mocks.tenantMembership,
    orgUnit: mocks.orgUnit,
    team: mocks.team,
    role: mocks.role,
    guardianRelationship: mocks.guardianRelationship,
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

vi.mock("@/lib/communication/platform/safeguarding/tenant-safeguarding-policy", () => ({
  loadTenantCommunicationSafeguardingPolicy: mocks.loadTenantCommunicationSafeguardingPolicy,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/structural-resolution", () => ({
  resolveStructuralAudiencePersonIds: vi.fn(async () => []),
  resolveStructuralExclusionPersonIds: vi.fn(async () => []),
  resolveExplicitPersonIds: vi.fn(async (_tenantId: string, ids: string[]) => ({
    active: ids,
    inactiveOrForeign: [],
  })),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/guardian-expansion", () => ({
  loadGuardianExpansionsForSubjects: vi.fn(async () => []),
  createGuardianExpansionPortForTenant: vi.fn(async () => ({
    expandSubjectsToDeliveryTargets: vi.fn(async ({ subjectPersonIds }: { subjectPersonIds: string[] }) =>
      subjectPersonIds.map((id) => ({
        subjectPersonId: id,
        deliveryUserId: `user-${id}`,
        channel: "EMAIL",
        viaGuardianSubstitution: false,
        safeguardingReasonCode: null,
        guardianPersonId: null,
      })),
    ),
  })),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/person-channel-profile", () => ({
  loadPersonChannelProfiles: vi.fn(async (tenantId: string, ids: string[]) =>
    new Map(
      ids.map((id) => [
        id,
        {
          personId: id,
          tenantId,
          isActive: true,
          userId: `user-${id}`,
          email: `${id}@example.com`,
        },
      ]),
    ),
  ),
  loadSubjectPersonNotificationContexts: vi.fn(async () => new Map()),
  isPersonEligibleForChannel: vi.fn(() => true),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/preference-seam", () => ({
  loadExplicitUserPreferenceMap: vi.fn(async () => new Map()),
  evaluateCommunicationPreferenceForDeliveryUser: vi.fn(async () => ({ allowed: true })),
  deliveryUserReachableForChannel: vi.fn(async () => true),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/sender-scope", () => ({
  resolveSenderCommunicationScope: vi.fn(async () => ({
    scope: { kind: "WHOLE_ORGANISATION" as const, tenantId: "tenant-a" },
    previewScopeLimited: false,
  })),
  intersectAudienceWithSenderScope: vi.fn((ids: string[]) => ids),
}));

const discoveryCtx = {
  tenantId: "tenant-a",
  userId: "user-coord",
  permissionKeys: new Set<string>([PERMISSIONS.REGISTRATIONS_VIEW]),
};

const materializationCtx = {
  tenantId: "tenant-a",
  senderUserId: "user-coord",
  discovery: discoveryCtx,
};

const submittedAtFixture = new Date("2026-01-01T12:00:00.000Z");

function mockProbetrainingRegistration(
  overrides: Record<string, unknown> & { id: string; tenantId: string },
) {
  return {
    phone: null,
    message: null,
    source: "WEB",
    submittedAt: submittedAtFixture,
    birthDate: null,
    payloadJson: {},
    person: null,
    ...overrides,
  };
}

describe("SCE-PROBETRAINING-COMM-01", () => {
  beforeEach(() => {
    _clearDomainAudienceRegistryForTests();
    vi.clearAllMocks();
    mocks.registration.findMany.mockResolvedValue([]);
    mocks.communicationExternalContact.findMany.mockResolvedValue([]);
    mocks.communicationExternalContact.findUnique.mockResolvedValue(null);
    mocks.communicationExternalContact.create.mockImplementation(async ({ data }: { data: { emailNormalized: string } }) => ({
      id: `ext-${data.emailNormalized}`,
      status: "ACTIVE",
    }));
    mocks.person.findMany.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
      const ids = args.where?.id?.in ?? [];
      return ids.map((id) => ({
        id,
        tenantId: "tenant-a",
        isActive: true,
        userId: `user-${id}`,
        email: `${id}@example.com`,
        dateOfBirth: id === "person-minor" ? new Date("2015-06-01") : new Date("1990-01-01"),
      }));
    });
    mocks.guardianRelationship.findMany.mockResolvedValue([]);
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.REGISTRATIONS_VIEW, PERMISSIONS.COMMUNICATION_CLUB_SEND],
    });
    mocks.loadTenantCommunicationSafeguardingPolicy.mockResolvedValue({
      safeguardingEnabled: true,
      minorAgeThresholdYears: 18,
      minorDirectMessaging: "BLOCK_TRAINER_TO_MINOR_DIRECT",
      guardianRecipient: "GUARDIAN_SUBSTITUTION",
    });
  });

  it("registers Probetraining source with stable German label", () => {
    ensureProbetrainingDomainAudienceRegistered();
    const source = getDomainAudienceSourceRegistry().get(PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY);
    expect(source?.key).toBe("probetraining.anmeldungen");
    expect(source?.label).toBe("Probetraining-Anmeldungen");
  });

  it("discovers source only with registrations.view", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    const hidden = await listAuthorizedDomainAudienceSources({
      tenantId: "tenant-a",
      userId: "user-a",
      permissionKeys: new Set([PERMISSIONS.COMMUNICATION_CLUB_SEND]),
    });
    expect(hidden).toEqual([]);

    const authorized = await listAuthorizedDomainAudienceSources(discoveryCtx);
    expect(authorized).toHaveLength(1);
    expect(authorized[0]?.requiredPermissions).toContain(PERMISSIONS.REGISTRATIONS_VIEW);
  });

  it("searches status-group candidates tenant-agnostically with German labels", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    const source = getDomainAudienceSourceRegistry().get(PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY)!;
    const candidates = await source.searchCandidates({
      tenantId: "tenant-a",
      senderUserId: "user-coord",
      query: "offen",
      limit: 10,
    });
    expect(candidates.some((c) => c.candidateId === "open-registrations")).toBe(true);
    expect(candidates[0]?.label).toMatch(/Offene|Warteliste|Archiv|Neu/i);
  });

  it("materializes linked persons and external contacts for unlinked adults", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    mocks.registration.findMany.mockResolvedValue([
      mockProbetrainingRegistration({
        id: "reg-1",
        tenantId: "tenant-a",
        personId: "person-linked",
        firstName: "Lara",
        lastName: "Muster",
        email: "lara@example.com",
        birthYear: 1990,
      }),
      mockProbetrainingRegistration({
        id: "reg-2",
        tenantId: "tenant-a",
        personId: null,
        firstName: "Max",
        lastName: "Erwachsen",
        email: "max@example.com",
        birthYear: 1985,
      }),
    ]);

    const materialized = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
              candidateId: "open-registrations",
            },
          },
        ],
      },
      materializationCtx,
    );

    expect(materialized.components[0]?.explicit?.includePersonIds).toEqual(["person-linked"]);
    expect(materialized.components[0]?.external?.includeExternalContactIds).toEqual([
      "ext-max@example.com",
    ]);
  });

  it("omits unlinked minors without usable guardian email (no raw child email)", async () => {
    await expect(
      materializeProbetrainingRegistrationsToAudienceComponent({
        tenantId: "tenant-a",
        senderUserId: "user-coord",
        registrations: [
          mockProbetrainingRegistration({
            id: "reg-minor-no-guardian",
            tenantId: "tenant-a",
            personId: null,
            firstName: "Kind",
            lastName: "Allein",
            email: "child@example.com",
            birthYear: new Date().getFullYear() - 10,
            payloadJson: {},
          }),
        ],
      }),
    ).rejects.toThrow(/Keine adressierbaren Empfänger/);
    expect(mocks.communicationExternalContact.create).not.toHaveBeenCalled();
  });

  it("uses guardian email for unlinked minors and skips raw child email", async () => {
    const component = await materializeProbetrainingRegistrationsToAudienceComponent({
      tenantId: "tenant-a",
      senderUserId: "user-coord",
      registrations: [
        mockProbetrainingRegistration({
          id: "reg-minor",
          tenantId: "tenant-a",
          personId: null,
          firstName: "Kind",
          lastName: "Muster",
          email: "kind@example.com",
          birthYear: new Date().getFullYear() - 10,
          payloadJson: {
            parentOrGuardian: {
              firstName: "Sandra",
              lastName: "Muster",
              email: "sandra@example.com",
            },
          },
        }),
      ],
    });
    expect(component.explicit).toBeUndefined();
    expect(component.external?.includeExternalContactIds).toEqual(["ext-sandra@example.com"]);
    expect(mocks.communicationExternalContact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ emailNormalized: "sandra@example.com" }),
      }),
    );
  });

  it("fails closed for unknown candidate ids", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
                candidateId: "does-not-exist",
              },
            },
          ],
        },
        materializationCtx,
      ),
    ).rejects.toMatchObject({ code: "CANDIDATE_RESOLUTION_FAILED" });
  });

  it("fails closed when domain permission is lost after save", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
                candidateId: "open-registrations",
              },
            },
          ],
        },
        {
          ...materializationCtx,
          discovery: {
            ...discoveryCtx,
            permissionKeys: new Set([PERMISSIONS.COMMUNICATION_CLUB_SEND]),
          },
        },
      ),
    ).rejects.toMatchObject({ code: "SOURCE_UNAUTHORIZED" });
  });

  it("scopes registration queries to tenant and PROBETRAINING type", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    mocks.registration.findMany.mockResolvedValue([
      mockProbetrainingRegistration({
        id: "reg-scope",
        tenantId: "tenant-a",
        personId: null,
        firstName: "Scope",
        lastName: "Test",
        email: "scope@example.com",
        birthYear: 1990,
      }),
    ]);
    await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
              candidateId: "status:new",
            },
          },
        ],
      },
      materializationCtx,
    );
    expect(mocks.registration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          type: "PROBETRAINING",
          status: { in: [RegistrationStatus.NEW] },
        }),
      }),
    );
  });

  it("round-trips saved Zielgruppe domain reference", () => {
    ensureProbetrainingDomainAudienceRegistered();
    const audience = {
      composition: "UNION" as const,
      components: [
        {
          domainAudience: {
            sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
            candidateId: "open-registrations",
            displayLabel: "Probetraining – Offene Anmeldungen",
          },
        },
      ],
    };
    const err = validateCommunicationAudienceSpec(audience);
    expect(err).toBeNull();
    const doc = buildZielgruppeRuleDocumentV2({ audience, resolverClause: null });
    const parsed = parseTargetGroupRuleJson(doc);
    expect(parsed.audience?.components[0]?.domainAudience?.candidateId).toBe("open-registrations");
  });

  it("preview provenance uses German human-readable label", () => {
    ensureProbetrainingDomainAudienceRegistered();
    expect(probetrainingAudienceProvenanceLabel("open-registrations")).toBe(
      "Probetraining – Offene Anmeldungen",
    );
    expect(
      domainAudienceProvenanceLabel({
        reference: {
          sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
          candidateId: "waiting-list",
        },
      }),
    ).toBe("Probetraining – Warteliste");
  });

  it("integrates with COMM-03 hybrid UNION (person + probetraining + external dedupe)", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    mocks.registration.findMany.mockResolvedValue([
      mockProbetrainingRegistration({
        id: "reg-1",
        tenantId: "tenant-a",
        personId: "person-shared",
        firstName: "A",
        lastName: "B",
        email: "shared@example.com",
        birthYear: 1990,
      }),
    ]);
    mocks.communicationExternalContact.findMany.mockResolvedValue([{ id: "ext-dup", emailNormalized: "shared@example.com" }]);
    mocks.person.findMany.mockImplementation(async (args: { where?: { id?: { in?: string[] }; email?: { in?: string[] } } }) => {
      if (args.where?.email?.in) {
        return [{ id: "person-shared", email: "shared@example.com", tenantId: "tenant-a", isActive: true }];
      }
      const ids = args.where?.id?.in ?? [];
      return ids.map((id) => ({
        id,
        tenantId: "tenant-a",
        isActive: true,
        email: "shared@example.com",
        user: null,
      }));
    });

    const result = await resolveAudienceCandidates({
      tenantId: "tenant-a",
      senderUserId: "user-coord",
      domainMaterialization: materializationCtx,
      audience: {
        composition: "UNION",
        components: [
          { explicit: { includePersonIds: ["person-shared"] } },
          {
            domainAudience: {
              sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
              candidateId: "open-registrations",
            },
          },
          { external: { includeExternalContactIds: ["ext-dup"] } },
        ],
      },
    });

    expect(result.candidatePersonIds).toEqual(["person-shared"]);
    expect(result.candidateExternalContactIds).toEqual([]);
  });

  it("routes linked minors through Person ids for COMM-03/COMM-18 (not raw registration email)", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    mocks.registration.findMany.mockResolvedValue([
      mockProbetrainingRegistration({
        id: "reg-minor-linked",
        tenantId: "tenant-a",
        personId: "person-minor",
        firstName: "Kind",
        lastName: "Linked",
        email: "kind@example.com",
        birthYear: new Date().getFullYear() - 10,
        person: { dateOfBirth: new Date("2015-01-01") },
      }),
    ]);

    const candidates = await resolveAudienceCandidates({
      tenantId: "tenant-a",
      senderUserId: "user-coord",
      domainMaterialization: materializationCtx,
      audience: {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
              candidateId: "open-registrations",
            },
          },
        ],
      },
    });
    expect(candidates.candidatePersonIds).toEqual(["person-minor"]);
    expect(mocks.communicationExternalContact.create).not.toHaveBeenCalled();

    const resolved = await resolveCommunicationRecipients({
      tenantId: "tenant-a",
      senderActor: { userId: "user-coord" },
      audience: {
        composition: "UNION",
        components: [{ explicit: { includePersonIds: ["person-minor"] } }],
      },
      context: { kind: "ORGANISATION", tenantId: "tenant-a" },
      channel: "EMAIL",
      category: "CLUB_OPERATIONAL",
      mode: "PREVIEW",
    });
    expect(resolved.metadata.preferenceEvaluation).toBe("EVALUATED");
  });

  it("hides unauthorized preview metadata via getAuthorizedDomainAudienceSource", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    const hidden = await getAuthorizedDomainAudienceSource(
      {
        tenantId: "tenant-a",
        userId: "user-a",
        permissionKeys: new Set<string>(),
      },
      PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
    );
    expect(hidden).toBeNull();
  });

  it("never broadens when materialization missing (DOMAIN-AUDIENCE-01 regression)", async () => {
    ensureProbetrainingDomainAudienceRegistered();
    await expect(
      resolveAudienceCandidates({
        tenantId: "tenant-a",
        audience: {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
                candidateId: "open-registrations",
              },
            },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });
});
