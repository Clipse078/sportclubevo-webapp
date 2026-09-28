import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  addExcludeRule,
  addIncludeRule,
  compositionModeLabel,
  definitionToVisualRules,
  removeIncludeRule,
} from "@/lib/communication/zielgruppen/visual-rules";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import { buildRuleJsonFromEditor, ruleJsonToEditorDefinition } from "@/lib/communication/zielgruppen/rule-mapper";
import { summarizeZielgruppeEditorDefinition } from "@/lib/communication/audience/human-audience-summary";
import { duplicateZielgruppe } from "@/lib/communication/zielgruppen/management-service";

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

describe("SCE-COMM-EVO-05 Zielgruppen UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orgUnit.findMany.mockResolvedValue([{ id: "ou-1", tenantId: "t-1" }]);
    mocks.team.findMany.mockResolvedValue([]);
    mocks.person.findMany.mockResolvedValue([]);
    mocks.role.findMany.mockResolvedValue([{ id: "r-1", key: "trainer" }]);
  });

  it("maps visual include rules to canonical editor definition", () => {
    let def = { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, compositionMode: "INTERSECTION" as const };
    def = addIncludeRule(def, "orgUnit", "ou-1");
    def = addIncludeRule(def, "role", "r-1");
    const { includeRules } = definitionToVisualRules(def);
    expect(includeRules).toHaveLength(2);
    expect(compositionModeLabel(def.compositionMode)).toBe("Alle Bedingungen");
  });

  it("round-trips editor definition through rule JSON without loss", () => {
    const definition = addExcludeRule(
      addIncludeRule(
        { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, compositionMode: "INTERSECTION" },
        "orgUnit",
        "ou-1",
      ),
      "excludeRole",
      "r-1",
    );
    const doc = buildRuleJsonFromEditor({
      definition,
      roleKeys: ["trainer"],
      excludeRoleKeys: ["vorstand"],
    });
    const restored = ruleJsonToEditorDefinition(doc);
    expect(restored.orgUnitIds).toEqual(["ou-1"]);
    expect(restored.compositionMode).toBe("INTERSECTION");
    expect(doc.structuralExclusion?.roleKeys).toEqual(["vorstand"]);
  });

  it("builds human summary with AND and exclusion semantics", () => {
    const definition = removeIncludeRule(
      addIncludeRule(
        addIncludeRule(
          { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, compositionMode: "INTERSECTION" },
          "orgUnit",
          "ou-1",
        ),
        "role",
        "r-1",
      ),
      "orgUnit",
      "ou-1",
    );
    const withBoth = addIncludeRule(
      addIncludeRule(
        { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, compositionMode: "INTERSECTION" },
        "orgUnit",
        "ou-1",
      ),
      "role",
      "r-1",
    );
    const summary = summarizeZielgruppeEditorDefinition(withBoth, {
      orgUnits: { "ou-1": "Junioren" },
      roles: { "r-1": "Trainer" },
    });
    expect(summary).toContain("Junioren");
    expect(summary).toContain("Trainer");
    expect(definition.orgUnitIds).toEqual([]);
  });

  it("duplicate copies rules and description with default name", async () => {
    mocks.targetGroup.findUnique.mockResolvedValue({
      id: "tg-1",
      tenantId: "t-1",
      key: "trainers",
      name: "Trainer Junioren",
      description: "Desc",
      status: "ACTIVE",
      ruleJson: buildRuleJsonFromEditor({
        definition: addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "orgUnit", "ou-1"),
        roleKeys: [],
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.targetGroup.findFirst.mockResolvedValue(null);
    mocks.targetGroup.create.mockImplementation(async ({ data }) => ({
      id: "tg-2",
      ...data,
    }));

    const created = await duplicateZielgruppe({
      tenantId: "t-1",
      sourceTargetGroupId: "tg-1",
    });
    expect(created.name).toBe("Kopie von Trainer Junioren");
    expect(mocks.targetGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Desc",
        }),
      }),
    );
  });
});
