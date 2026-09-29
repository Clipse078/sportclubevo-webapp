import { describe, expect, it } from "vitest";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import {
  zielgruppeDynamicIncludeAudienceSelection,
  zielgruppeIncludeAudienceSelection,
} from "@/lib/communication/zielgruppen/audience-selection-bridge";
import { addIncludeRule } from "@/lib/communication/zielgruppen/visual-rules";
import { buildRuleJsonFromEditor } from "@/lib/communication/zielgruppen/rule-mapper";

describe("zielgruppe audience selection bridge (UXR3)", () => {
  it("include selection merges structural ids and explicit persons", () => {
    const definition = addIncludeRule(
      addIncludeRule(
        addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "team", "t-1"),
        "orgUnit",
        "ou-1",
      ),
      "person",
      "p-1",
    );
    const selection = zielgruppeIncludeAudienceSelection(definition);
    expect(selection.teamIds).toEqual(["t-1"]);
    expect(selection.orgUnitIds).toEqual(["ou-1"]);
    expect(selection.personIds).toEqual(["p-1"]);
    expect(selection.externalContactIds).toEqual([]);
  });

  it("dynamic include selection excludes persons (legacy adapter)", () => {
    const definition = addIncludeRule(
      addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "role", "r-1"),
      "person",
      "p-1",
    );
    const dynamic = zielgruppeDynamicIncludeAudienceSelection(definition);
    expect(dynamic.roleIds).toEqual(["r-1"]);
    expect(dynamic.personIds).toEqual([]);
  });

  it("person maps to explicit includePersonIds in rule JSON", () => {
    const doc = buildRuleJsonFromEditor({
      definition: addIncludeRule(
        addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "team", "t-1"),
        "person",
        "p-direct",
      ),
      roleKeys: [],
    });
    expect(doc.audience.components[0]?.structural?.teamIds).toEqual(["t-1"]);
    expect(doc.audience.components[0]?.explicit?.includePersonIds).toEqual(["p-direct"]);
  });

  it("org unit and role remain structural in rule JSON", () => {
    const doc = buildRuleJsonFromEditor({
      definition: addIncludeRule(
        addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "orgUnit", "ou-1"),
        "role",
        "r-1",
      ),
      roleKeys: ["trainer"],
    });
    expect(doc.audience.components[0]?.structural?.orgUnitIds).toEqual(["ou-1"]);
    expect(doc.audience.components[0]?.structural?.roleKeys).toEqual(["trainer"]);
    expect(doc.audience.components[0]?.explicit?.includePersonIds).toBeUndefined();
  });
});
