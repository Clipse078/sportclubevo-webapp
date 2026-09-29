import { describe, expect, it } from "vitest";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import { addIncludeRule, removeIncludeRule } from "@/lib/communication/zielgruppen/visual-rules";
import {
  buildRuleJsonFromEditor,
  editorDefinitionToAudienceSpec,
} from "@/lib/communication/zielgruppen/rule-mapper";

describe("SCE-ZIELGRUPPEN-02-UXR3 unified include semantics", () => {
  it("AND/OR composition applies to structural clauses only", () => {
    const definition = {
      ...addIncludeRule(
        addIncludeRule(
          addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "orgUnit", "ou-1"),
          "role",
          "r-1",
        ),
        "person",
        "p-1",
      ),
      compositionMode: "INTERSECTION" as const,
    };
    const doc = buildRuleJsonFromEditor({ definition, roleKeys: ["trainer"] });
    expect(doc.resolverClause?.type).toBe("intersection");
    expect(doc.audience.components[0]?.explicit?.includePersonIds).toEqual(["p-1"]);
  });

  it("explicit person remains unioned with structural audience spec", () => {
    const spec = editorDefinitionToAudienceSpec(
      addIncludeRule(
        addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "team", "t-1"),
        "person",
        "p-1",
      ),
      [],
    );
    expect(spec.components).toHaveLength(1);
    expect(spec.components[0]?.structural?.teamIds).toEqual(["t-1"]);
    expect(spec.components[0]?.explicit?.includePersonIds).toEqual(["p-1"]);
  });

  it("person removal clears explicit ids only", () => {
    const withPerson = addIncludeRule(
      addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "team", "t-1"),
      "person",
      "p-1",
    );
    const next = removeIncludeRule(withPerson, "person", "p-1");
    expect(next.includePersonIds).toEqual([]);
    expect(next.teamIds).toEqual(["t-1"]);
  });

  it("whole organisation flag preserved alongside explicit person", () => {
    const doc = buildRuleJsonFromEditor({
      definition: {
        ...addIncludeRule(EMPTY_ZIELGRUPPE_EDITOR_DEFINITION, "person", "p-1"),
        wholeOrganisation: true,
      },
      roleKeys: [],
    });
    expect(doc.audience.components[0]?.structural?.wholeOrganisation).toBe(true);
    expect(doc.audience.components[0]?.explicit?.includePersonIds).toEqual(["p-1"]);
  });
});
