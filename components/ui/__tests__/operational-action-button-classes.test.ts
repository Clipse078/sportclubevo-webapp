import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_ACTION_ACCENT_CLASS,
  OPERATIONAL_ACTION_NEUTRAL_CLASS,
  OPERATIONAL_ACTION_NEUTRAL_COMPACT_CLASS,
} from "../operational-action-button-classes";

describe("operational-action-button-classes", () => {
  it("uses SCE accent for add-style actions, not success green", () => {
    expect(OPERATIONAL_ACTION_ACCENT_CLASS).toContain("var(--sce-primary)");
    expect(OPERATIONAL_ACTION_ACCENT_CLASS).not.toMatch(/sce-success/);
  });

  it("uses neutral tokens for remove/secondary actions, not danger red", () => {
    expect(OPERATIONAL_ACTION_NEUTRAL_CLASS).toContain("var(--text-2)");
    expect(OPERATIONAL_ACTION_NEUTRAL_CLASS).not.toMatch(/sce-danger/);
    expect(OPERATIONAL_ACTION_NEUTRAL_COMPACT_CLASS).not.toMatch(/sce-danger/);
  });
});
