import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("TrainingSessionEditForm — date/time layout contract (UX-03R1)", () => {
  const formPath = join(process.cwd(), "components/admin/training/TrainingSessionEditForm.tsx");
  const layoutPath = join(process.cwd(), "components/admin/training/form/training-form-layout.ts");

  it("uses shared datetime grid with minimum date width and compact time columns", () => {
    const source = readFileSync(formPath, "utf8");
    const layout = readFileSync(layoutPath, "utf8");
    expect(source).toContain("TRAINING_SESSION_EDIT_DATETIME_GRID_CLASS");
    expect(source).toContain("TRAINING_SESSION_EDIT_DATE_INPUT_CLASS");
    expect(source).toContain("training-session-edit-datetime-fields");
    expect(layout).toContain("min-w-[10.5rem]");
    expect(layout).toContain("TRAINING_SESSION_EDIT_DATETIME_GRID_CLASS");
  });
});
