import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * TRAININGCENTER-UX-03 / UX-03R1 — single-session edit route SCE composition contract.
 */
describe("Training session edit route — SCE workspace", () => {
  const pagePath = join(
    process.cwd(),
    "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
  );

  const formPath = join(process.cwd(), "components/admin/training/TrainingSessionEditForm.tsx");
  const headerPath = join(process.cwd(), "components/admin/training/TrainingSessionEditHeader.tsx");

  function readPage() {
    return readFileSync(pagePath, "utf8");
  }

  it("uses responsive 12-column workspace with date/time and participation panels", () => {
    const source = readPage();
    expect(source).toContain("training-session-edit-workspace-grid");
    expect(source).toContain("lg:grid-cols-12");
    expect(source).toContain("items-start");
    expect(source).toContain("self-start");
    expect(source).toContain("training-session-edit-datetime-panel");
    expect(source).toContain("training-session-edit-participation-panel");
  });

  it("does not use legacy white card shells on the route", () => {
    const source = readPage();
    expect(source).not.toMatch(/bg-white/);
    expect(source).not.toMatch(/border-gray-200/);
    expect(source).toContain("TRAINING_FORM_WORKSPACE_SURFACE_CLASS");
  });

  it("preserves authorization boundary and session loader", () => {
    const source = readPage();
    expect(source).toContain("requireAnyPermission");
    expect(source).toContain("getTrainingSession");
    expect(source).toContain("PERMISSIONS.TRAININGS_VIEW");
    expect(source).toContain("PERMISSIONS.TRAININGS_MANAGE");
  });

  it("uses compact header navigation without stacked breadcrumb row", () => {
    const page = readPage();
    const header = readFileSync(headerPath, "utf8");
    expect(page).not.toContain("PageBreadcrumbs");
    expect(page).toContain("backNavTrainings");
    expect(page).toContain("training-session-edit-inheritance-intro");
    expect(header).toContain("training-session-edit-back-link");
    expect(header.match(/<h1/g)?.length).toBe(1);
  });

  it("preserves contextual actions and form wiring", () => {
    const source = readPage();
    expect(source).toContain("TrainingSessionEditForm");
    expect(source).toContain("ParticipationRequestConfigEditor");
    expect(source).toContain("buildTrainingSeriesEditHref");
    expect(source).toContain("buildTrainingSessionWochenplanerHref");
    expect(source).toContain("TrainingSessionEditHeader");
  });

  it("uses i18n for user-facing session edit copy", () => {
    const source = readPage();
    expect(source).toContain('getTranslations("TrainingCenter.sessionEdit")');
  });

  it("edit form keeps reschedule save contract and SCE form controls", () => {
    const source = readFileSync(formPath, "utf8");
    expect(source).toContain("/api/training-sessions/${sessionId}/reschedule");
    expect(source).toContain("training-session-edit-save");
    expect(source).toContain("training-session-edit-use-default");
    expect(source).toContain("TRAINING_SESSION_EDIT_DATETIME_GRID_CLASS");
    expect(source).not.toMatch(/border-gray-300/);
  });
});
