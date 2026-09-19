import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * SCE-RESPONSIVE-01E/01F — Class C legacy training session editor (pre-existing on STAGE).
 * Documents route classification only; does not lock legacy light-surface visuals as product contract.
 */
describe("Training session edit route — Class C legacy classification", () => {
  const pagePath = join(
    process.cwd(),
    "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
  );

  it("remains on the dedicated legacy page shell (not shared training workspace components)", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).not.toMatch(/TrainingManagementWorkspace|TrainingRecordWorkspace/);
  });
});
