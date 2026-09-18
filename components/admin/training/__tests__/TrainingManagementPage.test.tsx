/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainingLoadingShell from "@/components/admin/training/loading/TrainingLoadingShell";
import TrainingManagementWorkspace from "@/components/admin/training/TrainingManagementWorkspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/dashboard/training",
  useSearchParams: () => new URLSearchParams(),
}));

const ROOT = resolve(__dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("SCE-TRAININGS-UX-01G Trainings management shell", () => {
  it("training page source does not render Kalender tab or calendar overview", () => {
    const source = readSource("app/(admin)/dashboard/training/page.tsx");
    expect(source).not.toContain("TrainingCenterOverview");
    expect(source).not.toContain("TrainingMonthCalendar");
    expect(source).not.toContain('label: "Kalender"');
    expect(source).not.toContain("buildTrainingCenterViewModel");
    expect(source).not.toContain("listTrainingSessionDateBounds");
    expect(source).toContain("TrainingManagementWorkspace");
    expect(source).not.toContain("listTrainingSessions");
    expect(source).not.toContain("resolveManagementSessionDateWindow");
    expect(source).not.toContain("buildTrainingSeriesCockpitViewModel");
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
  });

  it("workspace has no Einzeltrainings section or create dropdown", () => {
    render(
      <TrainingManagementWorkspace
        canCreate
        canManage
        canDelete={false}
        isCoordinator
        locale="de-CH"
        timezone="Europe/Zurich"
        wochenplanerHref="/dashboard/planner/week"
        seriesRows={[]}
        teamOptions={[]}
        archivedCount={0}
        sort="UPDATED_DESC"
        pagination={{
          page: 1,
          pageCount: 1,
          rangeStart: 0,
          rangeEnd: 0,
          totalCount: 0,
        }}
        filters={{ archived: false }}
        kpis={{ active: 0, inactive: 0, archived: 0, total: 0 }}
        teamHrefByValue={{ "": "/dashboard/training" }}
        statusHrefByValue={{ "": "/dashboard/training" }}
        resetFiltersHref="/dashboard/training"
      />,
    );

    expect(screen.queryByTestId("training-sessions-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("training-create-menu-trigger")).not.toBeInTheDocument();
    expect(screen.getByTestId("training-create-link")).toHaveAttribute("href", "/dashboard/training/new");
    expect(screen.getByTestId("training-quick-wochenplaner")).toHaveTextContent("Wochenplaner öffnen");
    expect(screen.queryByText("Serien")).not.toBeInTheDocument();
    expect(screen.queryByText("Einzeltrainings")).not.toBeInTheDocument();
    expect(screen.queryByText("Filtern")).not.toBeInTheDocument();
  });

  it("workspace uses planning management shell with KPIs and filter rail", () => {
    render(
      <TrainingManagementWorkspace
        canCreate
        canManage
        canDelete={false}
        isCoordinator
        locale="de-CH"
        timezone="Europe/Zurich"
        wochenplanerHref="/dashboard/planner/week"
        seriesRows={[]}
        teamOptions={[]}
        archivedCount={0}
        sort="UPDATED_DESC"
        kpis={{ active: 2, inactive: 1, archived: 0, total: 3 }}
        pagination={{
          page: 1,
          pageCount: 1,
          rangeStart: 0,
          rangeEnd: 0,
          totalCount: 0,
        }}
        filters={{ archived: false }}
        teamHrefByValue={{ "": "/dashboard/training" }}
        statusHrefByValue={{ "": "/dashboard/training", ALL: "/dashboard/training?seriesStatus=ALL" }}
        resetFiltersHref="/dashboard/training"
      />,
    );

    expect(screen.getByTestId("training-kpi-cards")).toBeInTheDocument();
    expect(screen.getByTestId("training-management-rail")).toBeInTheDocument();
    expect(screen.getByTestId("training-filter-rail")).toBeInTheDocument();
    expect(screen.getByTestId("training-search")).toBeInTheDocument();
    expect(screen.getByText("Planung")).toBeInTheDocument();
  });

  it("session edit route remains in codebase", () => {
    const source = readSource("app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx");
    expect(source).toContain("TrainingSessionRecordWorkspace");
  });
});
