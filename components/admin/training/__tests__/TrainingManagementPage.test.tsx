/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrainingLoadingShell from "@/components/admin/training/loading/TrainingLoadingShell";

const ROOT = resolve(__dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("SCE-TRAININGS-UX-01 Trainings management shell", () => {
  it("training page source does not render Kalender tab or calendar overview", () => {
    const source = readSource("app/(admin)/dashboard/training/page.tsx");
    expect(source).not.toContain("TrainingCenterOverview");
    expect(source).not.toContain("TrainingMonthCalendar");
    expect(source).not.toContain('label: "Kalender"');
    expect(source).not.toContain("buildTrainingCenterViewModel");
    expect(source).not.toContain("listTrainingSessionDateBounds");
    expect(source).toContain("TrainingManagementWorkspace");
    expect(source).toContain("resolveManagementSessionDateWindow");
  });

  it("legacy planungsraster redirect remains", () => {
    const source = readSource("app/(admin)/dashboard/training/page.tsx");
    expect(source).toContain('params.tab === "planungsraster"');
    expect(source).toContain("buildWochenplanerResourcesHrefFromLegacyTrainingParams");
  });

  it("loading shell uses SCE minimal loader copy", () => {
    render(<TrainingLoadingShell />);
    expect(screen.getByTestId("training-management-loading")).toBeInTheDocument();
    expect(screen.getByText("Trainings werden geladen …")).toBeInTheDocument();
    expect(screen.getByText("Serien und Einzeltrainings werden vorbereitet")).toBeInTheDocument();
  });
});
