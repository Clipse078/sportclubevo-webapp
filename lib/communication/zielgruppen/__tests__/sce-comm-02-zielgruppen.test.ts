import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildRuleJsonFromEditor,
  editorDefinitionToAudienceSpec,
  ruleJsonToEditorDefinition,
} from "@/lib/communication/zielgruppen/rule-mapper";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import { extractResolverClauseFromRuleJson } from "@/lib/communication/zielgruppen/rule-document";
import {
  validateZielgruppeEditorDefinition,
  validateZielgruppeName,
} from "@/lib/communication/zielgruppen/validation";
import { summarizeZielgruppeDefinition } from "@/lib/communication/zielgruppen/summary";
import {
  createZielgruppe,
  archiveZielgruppe,
  restoreZielgruppe,
  updateZielgruppe,
  listZielgruppenForManagement,
  ZielgruppeManagementError,
} from "@/lib/communication/zielgruppen/management-service";

const mocks = vi.hoisted(() => ({
  targetGroup: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  orgUnit: { findMany: vi.fn() },
  team: { findMany: vi.fn() },
  person: { findMany: vi.fn() },
  role: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    targetGroup: mocks.targetGroup,
    orgUnit: mocks.orgUnit,
    team: mocks.team,
    person: mocks.person,
    role: mocks.role,
  },
}));

describe("SCE-COMM-02 Zielgruppen management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orgUnit.findMany.mockResolvedValue([]);
    mocks.team.findMany.mockResolvedValue([]);
    mocks.person.findMany.mockResolvedValue([]);
    mocks.role.findMany.mockResolvedValue([]);
  });

  it("maps editor definition to valid CommunicationAudienceSpec (COMM-01)", () => {
    const doc = buildRuleJsonFromEditor({
      definition: {
        wholeOrganisation: false,
        orgUnitIds: ["ou-1"],
        teamIds: ["team-1"],
        roleIds: [],
        includePersonIds: ["p-1"],
        excludePersonIds: ["p-2"],
      },
      roleKeys: ["trainer"],
    });
    expect(validateCommunicationAudienceSpec(doc.audience)).toBeNull();
    expect(doc.resolverClause?.type).toBe("union");
  });

  it("whole organisation stores structural intent without materialising persons", () => {
    const doc = buildRuleJsonFromEditor({
      definition: {
        wholeOrganisation: true,
        orgUnitIds: [],
        teamIds: [],
        roleIds: [],
        includePersonIds: [],
        excludePersonIds: [],
      },
      roleKeys: [],
    });
    expect(doc.audience.components[0]?.structural?.wholeOrganisation).toBe(true);
    expect(doc.resolverClause).toBeNull();
    expect(extractResolverClauseFromRuleJson(doc)).toBeNull();
  });

  it("rejects include/exclude overlap in validation", () => {
    const err = validateZielgruppeEditorDefinition(
      {
        wholeOrganisation: false,
        orgUnitIds: ["ou-1"],
        teamIds: [],
        roleIds: [],
        includePersonIds: ["p-1"],
        excludePersonIds: ["p-1"],
      },
      [],
    );
    expect(err).toMatch(/ausgeschlossen/i);
  });

  it("summarises structural counts without recipient totals", () => {
    const summary = summarizeZielgruppeDefinition({
      wholeOrganisation: false,
      orgUnitIds: ["a", "b", "c"],
      teamIds: ["t1"],
      roleIds: ["r1"],
      includePersonIds: ["p1", "p2"],
      excludePersonIds: [],
    });
    expect(summary.parts.some((p) => p.includes("3 Organisationseinheiten"))).toBe(true);
    expect(summary.parts.some((p) => p.match(/^\d+ Empfänger/))).toBe(false);
  });

  it("createZielgruppe rejects cross-tenant org unit", async () => {
    mocks.orgUnit.findMany.mockResolvedValue([{ id: "ou-1", tenantId: "other" }]);
    await expect(
      createZielgruppe({
        tenantId: "tenant-a",
        name: "Test",
        definition: {
          wholeOrganisation: false,
          orgUnitIds: ["ou-1"],
          teamIds: [],
          roleIds: [],
          includePersonIds: [],
          excludePersonIds: [],
        },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("createZielgruppe persists v2 rule document", async () => {
    mocks.targetGroup.findFirst.mockResolvedValue(null);
    mocks.role.findMany.mockResolvedValue([{ id: "role-1", key: "trainer" }]);
    mocks.targetGroup.create.mockImplementation(async ({ data }) => ({
      id: "tg-new",
      ...data,
    }));

    await createZielgruppe({
      tenantId: "tenant-a",
      name: "Alle Trainer",
      definition: {
        wholeOrganisation: false,
        orgUnitIds: [],
        teamIds: [],
        roleIds: ["role-1"],
        includePersonIds: [],
        excludePersonIds: [],
      },
    });

    expect(mocks.role.findMany).toHaveBeenCalled();
    const payload = mocks.targetGroup.create.mock.calls[0][0].data.ruleJson;
    expect(payload.schemaVersion).toBe(2);
    expect(validateCommunicationAudienceSpec(payload.audience)).toBeNull();
  });

  it("listZielgruppenForManagement is tenant-scoped", async () => {
    mocks.targetGroup.findMany.mockResolvedValue([]);
    await listZielgruppenForManagement({ tenantId: "tenant-a", statusFilter: "ALL" });
    expect(mocks.targetGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-a" }),
      }),
    );
  });

  it("archive and restore toggle status", async () => {
    mocks.targetGroup.findUnique.mockResolvedValue({ id: "tg-1", tenantId: "tenant-a" });
    mocks.targetGroup.update.mockResolvedValue({ id: "tg-1", status: "ARCHIVED" });

    await archiveZielgruppe("tenant-a", "tg-1");
    expect(mocks.targetGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ARCHIVED" }),
      }),
    );

    mocks.targetGroup.update.mockResolvedValue({ id: "tg-1", status: "ACTIVE" });
    await restoreZielgruppe("tenant-a", "tg-1");
    expect(mocks.targetGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("validates required name", () => {
    expect(validateZielgruppeName("  ")).toMatch(/erforderlich/);
  });

  it("round-trips editor state through v2 rule json", () => {
    const spec = editorDefinitionToAudienceSpec(
      {
        wholeOrganisation: false,
        orgUnitIds: ["ou-1"],
        teamIds: [],
        roleIds: [],
        includePersonIds: [],
        excludePersonIds: [],
      },
      [],
    );
    const doc = buildRuleJsonFromEditor({
      definition: ruleJsonToEditorDefinition(
        buildRuleJsonFromEditor({
          definition: {
            wholeOrganisation: false,
            orgUnitIds: ["ou-1"],
            teamIds: [],
            roleIds: [],
            includePersonIds: [],
            excludePersonIds: [],
          },
          roleKeys: [],
        }),
      ),
      roleKeys: [],
    });
    expect(doc.audience.components[0]?.structural?.orgUnitIds).toEqual(["ou-1"]);
    expect(validateCommunicationAudienceSpec(spec)).toBeNull();
  });

  it("update rejects wrong tenant", async () => {
    mocks.targetGroup.findUnique.mockResolvedValue({ id: "tg-1", tenantId: "tenant-b" });
    await expect(
      updateZielgruppe({ tenantId: "tenant-a", targetGroupId: "tg-1", name: "X" }),
    ).rejects.toBeInstanceOf(ZielgruppeManagementError);
  });
});
