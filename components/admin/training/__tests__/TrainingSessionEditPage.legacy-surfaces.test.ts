import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * SCE-RESPONSIVE-01E — training single-session editor was already legacy on STAGE;
 * current branch must not be mistaken for a shared-shell regression.
 */
describe("Training session edit route legacy surface contract", () => {
  const pagePath = join(
    process.cwd(),
    "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
  );

  it("uses explicit legacy light card surfaces (Class C backlog, not branch regression)", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain("border-gray-200 bg-white");
    expect(source).toContain("Zurück zu Trainings");
    expect(source).not.toMatch(/TrainingManagementWorkspace|TrainingRecordWorkspace/);
  });
});
