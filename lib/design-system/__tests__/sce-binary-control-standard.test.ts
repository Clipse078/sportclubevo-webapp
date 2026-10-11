import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SwitchThumb, SwitchToggle } from "@/components/ui/SwitchToggle";

const DESIGN_SYSTEM_DOC = join(
  process.cwd(),
  "docs/design/SCE-DESIGN-SYSTEM.md",
);

describe("SCE Control Standard — Toggle First (design system guardrail)", () => {
  it("documents Toggle First and binary control compliance in SCE-DESIGN-SYSTEM.md", () => {
    const doc = readFileSync(DESIGN_SYSTEM_DOC, "utf8");
    expect(doc).toContain("SCE Control Standard — Toggle First");
    expect(doc).toContain("BINARY_CONTROL_COMPLIANCE");
    expect(doc).toContain("NEW_BINARY_CHECKBOXES");
    expect(doc).toContain("CANONICAL_TOGGLES_USED");
    expect(doc).toContain("MULTI_SELECTION_PATTERN");
    expect(doc).toContain("SwitchToggle");
  });

  it("exposes canonical SwitchToggle primitives (role=switch, not setting checkboxes)", () => {
    expect(SwitchToggle).toBeDefined();
    expect(SwitchThumb).toBeDefined();
    const source = readFileSync(
      join(process.cwd(), "components/ui/SwitchToggle.tsx"),
      "utf8",
    );
    expect(source).toContain('role="switch"');
    expect(source).toContain("Do NOT use checkboxes for these controls");
  });
});
