import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * TRAININGS-UX-03 — modern Training Session Record Workspace contract (static).
 */
describe("Training session edit route — record workspace contract", () => {
  const pagePath = join(
    process.cwd(),
    "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
  );

  it("renders the canonical Training Session Record Workspace", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain("TrainingSessionRecordWorkspace");
    expect(source).not.toContain("AdminSectionHeader");
    expect(source).not.toContain("TrainingCenter");
  });

  it("does not embed legacy bright-white card shells on the route", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).not.toMatch(/border-gray-200 bg-white/);
    expect(source).not.toMatch(/max-w-\[900px\]/);
  });

  it("uses accepted SCE record shell and responsive rail architecture", () => {
    const workspaceSource = readFileSync(
      join(process.cwd(), "components/admin/training/record/TrainingSessionRecordWorkspace.tsx"),
      "utf8",
    );
    expect(workspaceSource).toContain("TrainingRecordWorkspaceShell");
    expect(workspaceSource).toContain("TrainingSessionRecordContextRail");
    expect(workspaceSource).toContain("Planung");
    expect(workspaceSource).toContain("Einzeltermin");
    expect(workspaceSource).toContain("training-session-record-section-termin");
    expect(workspaceSource).toContain("training-session-record-section-resources");
  });
});

describe("Training session edit route — legacy white-surface regression guard", () => {
  const pagePath = join(
    process.cwd(),
    "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
  );

  it("scoped guard: route must not reintroduce giant legacy white edit cards", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).not.toMatch(/rounded-xl border border-gray-200 bg-white p-6 shadow-sm/);
  });
});
