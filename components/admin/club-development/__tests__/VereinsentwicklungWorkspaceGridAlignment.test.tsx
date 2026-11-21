/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TargetStatus, TaskStatus } from "@prisma/client";
import StrategienWorkspaceListPanel from "../StrategienWorkspaceListPanel";
import ZieleWorkspacePanel from "../ZieleWorkspacePanel";
import VereinsentwicklungConnectedTaskTable from "../VereinsentwicklungConnectedTaskTable";
import type { VereinsentwicklungConnectedTaskTableRowModel } from "@/lib/club-development/vereinsentwicklung-connected-task-table";
import { SCE_CD_OVERVIEW_UNIFIED_GRID, SCE_CD_OVERVIEW_UNIFIED_GRID_WITH_GRIP } from "../sce-club-development-surface-styles";
import {
  compareOverviewColumnOffsets,
  installOverviewGridLayoutMocks,
  SCE_CD_OVERVIEW_ALIGN_COLUMNS,
  assertOverviewHeadersShareGridTemplate,
} from "../vereinsentwicklung-overview-grid-alignment";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const taskRows: VereinsentwicklungConnectedTaskTableRowModel[] = [
  {
    taskId: "task-open",
    publicReference: "SCE-001051",
    title: "Offene Aufgabe",
    taskHref: "/dashboard/aufgaben/task-open",
    targetId: "t1",
    targetTitle: "Testziel",
    targetHref: "/vereinsleitung/targets/t1",
    strategyId: null,
    strategyTitle: null,
    strategyHref: null,
    orgUnitLabel: null,
    status: TaskStatus.OPEN,
    statusLabel: "Offen",
    assignees: [{ userId: "u1", displayName: "M. Keller", imageUrl: null }],
    progressHasChildRollup: false,
    progressCompletedCount: null,
    progressTotalCount: null,
  },
  {
    taskId: "task-done",
    publicReference: null,
    title: "Erledigt ohne Referenz",
    taskHref: "/dashboard/aufgaben/task-done",
    targetId: null,
    targetTitle: null,
    targetHref: null,
    strategyId: null,
    strategyTitle: null,
    strategyHref: null,
    orgUnitLabel: null,
    status: TaskStatus.DONE,
    statusLabel: "Erledigt",
    assignees: [],
    progressHasChildRollup: false,
    progressCompletedCount: null,
    progressTotalCount: null,
  },
];

describe("VereinsentwicklungWorkspaceGridAlignment", () => {
  it("uses unified grid on Strategien and Ziele workspace headers", () => {
    const { container: strategienContainer } = render(
      <StrategienWorkspaceListPanel
        strategies={[
          {
            id: "s1",
            title: "Gesamtverein",
            publicReference: "SCE-001042",
            scopeOrgUnitLabel: "Junioren",
            goalAchievementTotalCount: 2,
            goalAchievementCompletedCount: 2,
            goalAchievementCaption: "100%",
            createdAt: "2025-01-01",
          },
        ]}
        selectedStrategyId={null}
        canManage={false}
        orgUnitOptions={[]}
        timeZone="Europe/Zurich"
      />,
    );
    const strategienHeader = screen.getByTestId("strategien-workspace-list-header");
    expect(strategienHeader.className).toContain(SCE_CD_OVERVIEW_UNIFIED_GRID);

    const { container: zieleContainer } = render(
      <ZieleWorkspacePanel
        targets={[
          {
            id: "t1",
            title: "Testziel III",
            publicReference: "SCE-1000001",
            status: TargetStatus.ACTIVE,
            linkedClubStrategyTitle: "Gesamtverein",
            linkedClubStrategyId: "s1",
            orgUnitLabel: "Junioren",
            responsibleLabel: "M. Keller",
            deliveryProgressCaption: "100% – 2 von 2 erledigt",
          },
        ]}
        strategies={[]}
        focusTargetIds={new Set()}
        canManageTargets={false}
      />,
    );
    const zieleHeader = screen.getByTestId("ziele-workspace-list-header");
    expect(zieleHeader.className).toContain(SCE_CD_OVERVIEW_UNIFIED_GRID);
    expect(() => assertOverviewHeadersShareGridTemplate([strategienHeader, zieleHeader])).not.toThrow();

    installOverviewGridLayoutMocks(strategienContainer);
    for (const column of SCE_CD_OVERVIEW_ALIGN_COLUMNS) {
      const { aligned } = compareOverviewColumnOffsets(strategienContainer, column);
      expect(aligned, `strategien ${column}`).toBe(true);
    }
    installOverviewGridLayoutMocks(zieleContainer);
    for (const column of SCE_CD_OVERVIEW_ALIGN_COLUMNS) {
      const { aligned } = compareOverviewColumnOffsets(zieleContainer, column);
      expect(aligned, `ziele ${column}`).toBe(true);
    }
  });

  it("aligns Aufgaben backlog rows with status pills and reserved progress column", () => {
    const { container } = render(
      <VereinsentwicklungConnectedTaskTable rows={taskRows} testId="aufgaben-workspace-table" />,
    );
    const header = screen.getByTestId("vereinsentwicklung-task-table-header");
    expect(header.className).toContain(SCE_CD_OVERVIEW_UNIFIED_GRID);
    expect(screen.getByText("Offen")).toBeTruthy();
    expect(screen.getByText("Erledigt")).toBeTruthy();
    expect(screen.getByTestId("overview-task-progress-reserved-task-open")).toBeTruthy();

    installOverviewGridLayoutMocks(container);
    for (const column of SCE_CD_OVERVIEW_ALIGN_COLUMNS) {
      const { aligned } = compareOverviewColumnOffsets(container, column);
      expect(aligned, `aufgaben ${column}`).toBe(true);
    }
  });

  it("aligns Umsetzungsplanung header tracks when drag grip is present", () => {
    render(
      <VereinsentwicklungConnectedTaskTable
        rows={taskRows}
        showReorderHandle
        reorder={{
          dragEnabled: true,
          canReorder: true,
          allOrderedTaskIds: taskRows.map((r) => r.taskId),
          onPersistOrder: vi.fn(async () => ({ ok: true })),
        }}
        testId="umsetzung-unplanned-table"
      />,
    );
    const header = screen.getByTestId("vereinsentwicklung-task-table-header");
    expect(header.className).toContain(SCE_CD_OVERVIEW_UNIFIED_GRID_WITH_GRIP);
    expect(header.className).not.toContain("max-content");
  });
});