import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseBulkEmailEntries } from "@/lib/communication/external-contacts/bulk-email-parser";
import {
  classifyCommunicationExternalEmail,
  normalizeCommunicationExternalContactEmail,
} from "@/lib/communication/external-contacts/external-contact-email";
import { buildRuleJsonFromEditor } from "@/lib/communication/zielgruppen/rule-mapper";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import {
  dedupeExternalContactsAgainstPersonEmails,
  resolveExternalContactIdsFromAudience,
} from "@/lib/communication/platform/recipient-resolution/external-contact-resolution";
import { resolveAudienceCandidates } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import { createEmptyDomainAudienceSourceRegistry } from "@/lib/communication/platform/audience/domain-audience-source";

const mocks = vi.hoisted(() => ({
  communicationExternalContact: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  person: { findMany: vi.fn(), findFirst: vi.fn() },
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
  resolveStructuralAudiencePersonIds: vi.fn(async ({ selectors }: { selectors: { teamIds?: string[] } }) => {
    if (selectors.teamIds?.includes("team-f2")) return ["person-b", "person-excluded"];
    return [];
  }),
  resolveStructuralExclusionPersonIds: vi.fn(async () => []),
  resolveExplicitPersonIds: vi.fn(async (_tenantId: string, ids: string[]) => ({
    active: ids,
    inactiveOrForeign: [],
  })),
}));

vi.mock("@/lib/org/target-group-resolver", () => ({
  resolveTargetGroup: vi.fn(),
}));

describe("SCE-ZIELGRUPPEN-02 hybrid audiences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses bulk email separators and dedupes", () => {
    const parsed = parseBulkEmailEntries("a@x.ch\nb@x.ch, a@x.ch;b@x.ch");
    expect(parsed).toEqual(["a@x.ch", "b@x.ch"]);
  });

  it("validates email addresses using ADMIN-ACCESS semantics", () => {
    expect(classifyCommunicationExternalEmail("abc").ok).toBe(false);
    expect(classifyCommunicationExternalEmail("foo@").ok).toBe(false);
    expect(classifyCommunicationExternalEmail("person@gmail.c").ok).toBe(false);
    expect(classifyCommunicationExternalEmail("name@gmail.com").ok).toBe(true);
    expect(classifyCommunicationExternalEmail("name+football@gmail.com").ok).toBe(true);
    expect(classifyCommunicationExternalEmail("contact@fcallschwil.ch").ok).toBe(true);
    expect(normalizeCommunicationExternalContactEmail("Name@Example.COM")).toBe("Name@example.com");
  });

  it("maps hybrid editor state to valid audience spec with external contacts", () => {
    const doc = buildRuleJsonFromEditor({
      definition: {
        ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
        teamIds: ["team-f2"],
        includePersonIds: ["person-a"],
        includeExternalContactIds: ["ext-1"],
        excludePersonIds: ["person-excluded"],
        excludeExternalContactIds: ["ext-2"],
      },
      roleKeys: [],
    });
    expect(validateCommunicationAudienceSpec(doc.audience)).toBeNull();
    expect(doc.audience.components[0]?.external?.includeExternalContactIds).toEqual(["ext-1"]);
  });

  it("applies exclusion precedence and deduplicates external emails against persons", async () => {
    mocks.communicationExternalContact.findMany.mockResolvedValue([
      { id: "ext-1", emailNormalized: "parent@example.com" },
    ]);
    mocks.person.findMany.mockResolvedValue([
      {
        id: "person-a",
        email: "parent@example.com",
        user: null,
      },
    ]);

    const deduped = await dedupeExternalContactsAgainstPersonEmails({
      tenantId: "tenant-a",
      personIds: ["person-a"],
      externalContactIds: ["ext-1"],
    });
    expect(deduped).toEqual([]);
  });

  it("resolves external includes minus excludes", async () => {
    mocks.communicationExternalContact.findMany.mockResolvedValue([{ id: "ext-1" }]);
    mocks.person.findMany.mockResolvedValue([]);

    const ids = await resolveExternalContactIdsFromAudience({
      tenantId: "tenant-a",
      audience: {
        composition: "UNION",
        components: [
          {
            external: {
              includeExternalContactIds: ["ext-1", "ext-2"],
              excludeExternalContactIds: ["ext-2"],
            },
          },
        ],
      },
    });
    expect(ids).toEqual(["ext-1"]);
  });

  it("resolves hybrid audience candidates with structural team and explicit exclusion", async () => {
    mocks.communicationExternalContact.findMany.mockResolvedValue([]);
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
        components: [
          {
            structural: { teamIds: ["team-f2"] },
            explicit: { excludePersonIds: ["person-excluded"] },
          },
        ],
      },
      structuralExclusionSelectors: undefined,
    });

    expect(result.candidatePersonIds).toEqual(["person-b"]);
    expect(result.candidateExternalContactIds).toEqual([]);
  });

  it("exposes empty DomainAudienceSource registry seam (DOMAIN-AUDIENCE-01 not implemented)", () => {
    const registry = createEmptyDomainAudienceSourceRegistry();
    expect(registry.list()).toEqual([]);
    expect(registry.get("probetraining")).toBeNull();
  });
});
