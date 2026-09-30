import { describe, expect, it, beforeEach, vi } from "vitest";
import type { DomainAudienceSource } from "@/lib/communication/platform/audience/domain-audience-source";
import {
  _clearDomainAudienceRegistryForTests,
  getDomainAudienceSourceRegistry,
  registerDomainAudienceSource,
} from "@/lib/communication/platform/audience/domain-audience-registry";
import {
  getAuthorizedDomainAudienceSource,
  listAuthorizedDomainAudienceSources,
} from "@/lib/communication/platform/audience/domain-audience-discovery";
import {
  communicationAudienceSpecHasDomainReferences,
  materializeDomainAudiencesInSpec,
} from "@/lib/communication/platform/audience/domain-audience-expansion";
import { DomainAudienceError } from "@/lib/communication/platform/audience/domain-audience-errors";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import {
  buildZielgruppeRuleDocumentV2,
  parseTargetGroupRuleJson,
} from "@/lib/communication/zielgruppen/rule-document";
import { resolveAudienceCandidates } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  communicationExternalContact: { findMany: vi.fn() },
  person: { findMany: vi.fn() },
  targetGroup: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    communicationExternalContact: mocks.communicationExternalContact,
    person: mocks.person,
    targetGroup: mocks.targetGroup,
    user: { findMany: vi.fn().mockResolvedValue([]) },
    tenantMembership: { findMany: vi.fn().mockResolvedValue([]) },
    orgUnit: { findMany: vi.fn().mockResolvedValue([]) },
    team: { findMany: vi.fn().mockResolvedValue([]) },
    role: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/communication/platform/recipient-resolution/structural-resolution", () => ({
  resolveStructuralAudiencePersonIds: vi.fn(async () => []),
  resolveStructuralExclusionPersonIds: vi.fn(async () => []),
  resolveExplicitPersonIds: vi.fn(async (_tenantId: string, ids: string[]) => ({
    active: ids,
    inactiveOrForeign: [],
  })),
}));

function makeMockSource(overrides?: Partial<DomainAudienceSource>): DomainAudienceSource {
  return {
    key: "demo-module.demo-audience",
    domainKey: "demo-module",
    sourceKey: "demo-audience",
    label: "Demo-Zielgruppe",
    description: "Testquelle für DOMAIN-AUDIENCE-01",
    requiredPermissions: [PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW],
    searchCandidates: async () => [
      {
        sourceKey: "demo-module.demo-audience",
        candidateId: "candidate-1",
        label: "Demo Kandidat",
      },
    ],
    toAudienceComponent: (candidateId) => ({
      explicit: { includePersonIds: [candidateId === "candidate-1" ? "person-domain" : "person-other"] },
    }),
    provenanceLabel: () => "Demo-Modul – Demo-Zielgruppe",
    ...overrides,
  };
}

describe("SCE-DOMAIN-AUDIENCE-01 registry", () => {
  beforeEach(() => {
    _clearDomainAudienceRegistryForTests();
    vi.clearAllMocks();
    mocks.communicationExternalContact.findMany.mockResolvedValue([]);
    mocks.person.findMany.mockResolvedValue([]);
  });

  it("initializes deterministically with stable sorted source list", () => {
    registerDomainAudienceSource(makeMockSource());
    registerDomainAudienceSource(
      makeMockSource({
        key: "alpha-module.alpha-audience",
        domainKey: "alpha-module",
        sourceKey: "alpha-audience",
        label: "Alpha",
      }),
    );
    const keys = getDomainAudienceSourceRegistry()
      .list()
      .map((source) => source.key);
    expect(keys).toEqual(["alpha-module.alpha-audience", "demo-module.demo-audience"]);
  });

  it("rejects duplicate registration", () => {
    registerDomainAudienceSource(makeMockSource());
    expect(() => registerDomainAudienceSource(makeMockSource())).toThrow(
      'Domain audience source "demo-module.demo-audience" is already registered.',
    );
  });

  it("discovers sources only when caller holds required domain permissions", async () => {
    registerDomainAudienceSource(makeMockSource());
    const ctx = {
      tenantId: "tenant-a",
      userId: "user-a",
      permissionKeys: new Set<string>([PERMISSIONS.COMMUNICATION_CLUB_SEND]),
    };
    expect(await listAuthorizedDomainAudienceSources(ctx)).toEqual([]);

    const authorized = await listAuthorizedDomainAudienceSources({
      ...ctx,
      permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
    });
    expect(authorized).toHaveLength(1);
    expect(authorized[0]?.label).toBe("Demo-Zielgruppe");
  });

  it("hides unauthorized sources via getAuthorizedDomainAudienceSource", async () => {
    registerDomainAudienceSource(makeMockSource());
    const hidden = await getAuthorizedDomainAudienceSource(
      {
        tenantId: "tenant-a",
        userId: "user-a",
        permissionKeys: new Set<string>(),
      },
      "demo-module.demo-audience",
    );
    expect(hidden).toBeNull();
  });

  it("validates persisted domain audience references in CommunicationAudienceSpec", () => {
    const err = validateCommunicationAudienceSpec({
      composition: "UNION",
      components: [
        {
          domainAudience: { sourceKey: "invalid-key", candidateId: "x" },
        },
      ],
    });
    expect(err).toMatch(/composite key/);

    const ok = validateCommunicationAudienceSpec({
      composition: "UNION",
      components: [
        {
          domainAudience: {
            sourceKey: "demo-module.demo-audience",
            candidateId: "candidate-1",
            displayLabel: "Demo",
          },
        },
      ],
    });
    expect(ok).toBeNull();
  });

  it("materializes domain audience into canonical explicit persons", async () => {
    registerDomainAudienceSource(makeMockSource());
    const materialized = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: "demo-module.demo-audience",
              candidateId: "candidate-1",
            },
          },
        ],
      },
      {
        tenantId: "tenant-a",
        senderUserId: "user-a",
        discovery: {
          tenantId: "tenant-a",
          userId: "user-a",
          permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
        },
      },
    );
    expect(materialized.components[0]?.explicit?.includePersonIds).toEqual(["person-domain"]);
    expect(communicationAudienceSpecHasDomainReferences(materialized)).toBe(false);
  });

  it("fails closed when source is not registered", async () => {
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: "missing-module.missing-audience",
                candidateId: "candidate-1",
              },
            },
          ],
        },
        {
          tenantId: "tenant-a",
          senderUserId: "user-a",
          discovery: {
            tenantId: "tenant-a",
            userId: "user-a",
            permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
          },
        },
      ),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });

  it("integrates with COMM-03 candidate resolution via adapter expansion", async () => {
    registerDomainAudienceSource(makeMockSource());
    const result = await resolveAudienceCandidates({
      tenantId: "tenant-a",
      senderUserId: "user-a",
      domainMaterialization: {
        tenantId: "tenant-a",
        senderUserId: "user-a",
        discovery: {
          tenantId: "tenant-a",
          userId: "user-a",
          permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
        },
      },
      audience: {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: "demo-module.demo-audience",
              candidateId: "candidate-1",
            },
          },
        ],
      },
    });
    expect(result.candidatePersonIds).toEqual(["person-domain"]);
  });

  it("does not affect structural-only audiences when registry is empty", async () => {
    mocks.person.findMany.mockImplementation(async (args: { where: { id?: { in: string[] } } }) => {
      const ids = args.where.id?.in ?? [];
      return ids.map((id) => ({
        id,
        tenantId: "tenant-a",
        isActive: true,
        email: null,
        user: null,
      }));
    });

    const result = await resolveAudienceCandidates({
      tenantId: "tenant-a",
      audience: {
        composition: "UNION",
        components: [{ explicit: { includePersonIds: ["person-a"] } }],
      },
    });
    expect(result.candidatePersonIds).toEqual(["person-a"]);
  });
});

describe("SCE-DOMAIN-AUDIENCE-01 release closure gates", () => {
  beforeEach(() => {
    _clearDomainAudienceRegistryForTests();
    vi.clearAllMocks();
    mocks.communicationExternalContact.findMany.mockResolvedValue([]);
    mocks.person.findMany.mockResolvedValue([]);
  });

  it("keeps legacy v1 ruleJson parsing unchanged (no domain envelope)", () => {
    const legacy = { type: "personIds" as const, value: ["person-legacy"] };
    const parsed = parseTargetGroupRuleJson(legacy);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.audience).toBeNull();
    expect(parsed.resolverClause).toEqual(legacy);
  });

  it("round-trips domain references in v2 ruleJson deterministically", () => {
    const audience = {
      composition: "UNION" as const,
      components: [
        {
          domainAudience: {
            sourceKey: "demo-module.demo-audience",
            candidateId: "candidate-1",
            displayLabel: "Anzeige nur",
          },
        },
      ],
    };
    const doc = buildZielgruppeRuleDocumentV2({ audience, resolverClause: null });
    const parsed = parseTargetGroupRuleJson(doc);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.audience).toEqual(audience);
  });

  it("resolves mixed UNION audiences (structural + explicit + external + domain)", async () => {
    registerDomainAudienceSource(makeMockSource());
    mocks.communicationExternalContact.findMany.mockResolvedValue([{ id: "ext-1" }]);
    mocks.person.findMany.mockImplementation(async (args: { where: { id?: { in: string[] } } }) => {
      const ids = args.where.id?.in ?? [];
      return ids.map((id) => ({
        id,
        tenantId: "tenant-a",
        isActive: true,
        email: null,
        user: null,
      }));
    });

    const result = await resolveAudienceCandidates({
      tenantId: "tenant-a",
      senderUserId: "user-a",
      domainMaterialization: {
        tenantId: "tenant-a",
        senderUserId: "user-a",
        discovery: {
          tenantId: "tenant-a",
          userId: "user-a",
          permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
        },
      },
      audience: {
        composition: "UNION",
        components: [
          { structural: { teamIds: ["team-x"] } },
          { explicit: { includePersonIds: ["person-explicit"] } },
          { external: { includeExternalContactIds: ["ext-1"] } },
          {
            domainAudience: {
              sourceKey: "demo-module.demo-audience",
              candidateId: "candidate-1",
            },
          },
        ],
      },
    });

    expect(result.candidatePersonIds).toContain("person-domain");
    expect(result.candidatePersonIds).toContain("person-explicit");
    expect(result.candidateExternalContactIds).toEqual(["ext-1"]);
  });

  it("uses candidateId for identity — displayLabel does not change materialization", async () => {
    registerDomainAudienceSource(makeMockSource());
    const withLabel = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: "demo-module.demo-audience",
              candidateId: "candidate-1",
              displayLabel: "Irrelevant Label",
            },
          },
        ],
      },
      {
        tenantId: "tenant-a",
        senderUserId: "user-a",
        discovery: {
          tenantId: "tenant-a",
          userId: "user-a",
          permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
        },
      },
    );
    const withoutLabel = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: "demo-module.demo-audience",
              candidateId: "candidate-1",
            },
          },
        ],
      },
      {
        tenantId: "tenant-a",
        senderUserId: "user-a",
        discovery: {
          tenantId: "tenant-a",
          userId: "user-a",
          permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
        },
      },
    );
    expect(withLabel).toEqual(withoutLabel);
  });

  it("fails closed on unauthorized materialization (lost domain permission after save)", async () => {
    registerDomainAudienceSource(makeMockSource());
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: "demo-module.demo-audience",
                candidateId: "candidate-1",
              },
            },
          ],
        },
        {
          tenantId: "tenant-a",
          senderUserId: "user-a",
          discovery: {
            tenantId: "tenant-a",
            userId: "user-a",
            permissionKeys: new Set([PERMISSIONS.COMMUNICATION_CLUB_SEND]),
          },
        },
      ),
    ).rejects.toMatchObject({ code: "SOURCE_UNAUTHORIZED" });
  });

  it("fails closed when provider resolution throws", async () => {
    registerDomainAudienceSource(
      makeMockSource({
        resolveAudienceComponent: async () => {
          throw new Error("provider datastore unavailable");
        },
      }),
    );
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: "demo-module.demo-audience",
                candidateId: "candidate-1",
              },
            },
          ],
        },
        {
          tenantId: "tenant-a",
          senderUserId: "user-a",
          discovery: {
            tenantId: "tenant-a",
            userId: "user-a",
            permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
          },
        },
      ),
    ).rejects.toMatchObject({ code: "CANDIDATE_RESOLUTION_FAILED" });
  });

  it("rejects malformed domain references (whitespace padding)", async () => {
    registerDomainAudienceSource(makeMockSource());
    await expect(
      materializeDomainAudiencesInSpec(
        {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: " demo-module.demo-audience",
                candidateId: "candidate-1",
              },
            },
          ],
        },
        {
          tenantId: "tenant-a",
          senderUserId: "user-a",
          discovery: {
            tenantId: "tenant-a",
            userId: "user-a",
            permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
          },
        },
      ),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE" });
  });

  it("passes tenantId into provider resolution (cross-tenant isolation seam)", async () => {
    const resolveAudienceComponent = vi.fn(async (input: { tenantId: string; candidateId: string }) => ({
      explicit: { includePersonIds: [input.tenantId === "tenant-a" ? "person-ok" : "person-leak"] },
    }));
    registerDomainAudienceSource(
      makeMockSource({
        resolveAudienceComponent,
      }),
    );
    const materialized = await materializeDomainAudiencesInSpec(
      {
        composition: "UNION",
        components: [
          {
            domainAudience: {
              sourceKey: "demo-module.demo-audience",
              candidateId: "candidate-1",
            },
          },
        ],
      },
      {
        tenantId: "tenant-a",
        senderUserId: "user-a",
        discovery: {
          tenantId: "tenant-a",
          userId: "user-a",
          permissionKeys: new Set([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW]),
        },
      },
    );
    expect(resolveAudienceComponent).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-a", candidateId: "candidate-1" }),
    );
    expect(materialized.components[0]?.explicit?.includePersonIds).toEqual(["person-ok"]);
  });

  it("never broadens to whole organisation when domain materialization is missing", async () => {
    registerDomainAudienceSource(makeMockSource());
    await expect(
      resolveAudienceCandidates({
        tenantId: "tenant-a",
        audience: {
          composition: "UNION",
          components: [
            {
              domainAudience: {
                sourceKey: "demo-module.demo-audience",
                candidateId: "candidate-1",
              },
            },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(DomainAudienceError);
  });
});
