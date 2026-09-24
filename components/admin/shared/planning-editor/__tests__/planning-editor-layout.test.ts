import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PLANNING_EDITOR_DATETIME_GRID_CLASS,
  PLANNING_EDITOR_MAX_WIDTH_CLASS,
  PLANNING_EDITOR_SURFACE_CLASS,
} from "../planning-editor-layout";

describe("planning-editor-layout", () => {
  it("exports canonical SCE workspace tokens aligned with training reference", () => {
    expect(PLANNING_EDITOR_MAX_WIDTH_CLASS).toContain("72rem");
    expect(PLANNING_EDITOR_SURFACE_CLASS).toContain("bg-[var(--surface)]");
    expect(PLANNING_EDITOR_DATETIME_GRID_CLASS).toContain("sm:grid-cols");
  });

  it("training and match record layouts re-export the same canonical tokens", () => {
    const trainingLayout = readFileSync(
      join(process.cwd(), "components/admin/training/form/training-form-layout.ts"),
      "utf8",
    );
    const spieleLayout = readFileSync(
      join(process.cwd(), "components/admin/matchcenter/record/spiele-record-layout.ts"),
      "utf8",
    );
    expect(trainingLayout).toContain("planning-editor-layout");
    expect(spieleLayout).toContain("planning-editor-layout");
  });
});
