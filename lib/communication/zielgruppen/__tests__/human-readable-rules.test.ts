import { describe, expect, it } from "vitest";
import { buildHumanReadableZielgruppeRules } from "@/lib/communication/zielgruppen/human-readable-rules";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";

describe("human-readable Zielgruppe rules", () => {
  it("describes whole organisation", () => {
    const rules = buildHumanReadableZielgruppeRules({
      ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
      wholeOrganisation: true,
    });
    expect(rules.inclusionLines[0]).toMatch(/gesamte/i);
    expect(rules.isEmpty).toBe(false);
  });

  it("uses labels instead of raw ids", () => {
    const rules = buildHumanReadableZielgruppeRules(
      {
        ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
        teamIds: ["team-1"],
        roleIds: ["role-1"],
      },
      {
        teams: { "team-1": "F2" },
        roles: { "role-1": "Trainer" },
      },
    );
    expect(rules.inclusionLines.some((l) => l.includes("F2"))).toBe(true);
    expect(rules.inclusionLines.some((l) => l.includes("Trainer"))).toBe(true);
    expect(rules.inclusionLines.some((l) => l.includes("team-1"))).toBe(false);
  });

  it("reflects intersection semantics in hint", () => {
    const rules = buildHumanReadableZielgruppeRules({
      ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
      compositionMode: "INTERSECTION",
      orgUnitIds: ["ou-1"],
    });
    expect(rules.compositionHint).toMatch(/UND/i);
  });
});
