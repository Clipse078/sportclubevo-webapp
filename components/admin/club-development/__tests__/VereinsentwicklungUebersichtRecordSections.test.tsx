/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VereinsentwicklungUebersichtRecordSections from "../VereinsentwicklungUebersichtRecordSections";
import type { VereinsentwicklungOverviewPreview } from "@/lib/club-development/vereinsentwicklung-overview-preview";
import { TargetStatus, TaskStatus } from "@prisma/client";
import { SCE_CD_OVERVIEW_UNIFIED_GRID } from "../sce-club-development-surface-styles";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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

const preview: VereinsentwicklungOverviewPreview = {
  showStrategien: true,
  showZiele: true,
  showAufgaben: true,
  strategies: [
    {
      id: "s1",
      title: "Gesamtverein",
      publicReference: "SCE-001042",
      scopeOrgUnitLabel: "Gesamtverein",
      createdAt: "2025-01-01",
      goalAchievementTotalCount: 3,
      goalAchievementCompletedCount: 2,
      goalAchievementCaption: "66%",
    } as VereinsentwicklungOverviewPreview["strategies"][number],
  ],
  targets: [
    {
      id: "t1",
      title: "Testziel",
      publicReference: "SCE-1000001",
      status: TargetStatus.ACTIVE,
      linkedClubStrategyTitle: "Gesamtverein",
      linkedClubStrategyId: "s1",
      orgUnitLabel: "Junioren",
      responsibleLabel: "M. Keller",
      deliveryProgressCaption: "Noch keine Aufgaben",
    } as VereinsentwicklungOverviewPreview["targets"][number],
  ],
  tasks: [
    {
      id: "task-1",
      title: "Umsetzungsaufgabe",
      publicReference: "SCE-001051",
      status: TaskStatus.OPEN,
      statusLabel: "Offen",
      assigneeLabels: ["M. Keller"],
      targetId: "t1",
      targetTitle: "Testziel",
    } as VereinsentwicklungOverviewPreview["tasks"][number],
  ],
};

describe("VereinsentwicklungUebersichtRecordSections unified grid", () => {
  it("uses the shared grid class on all three section table headers", () => {
    render(<VereinsentwicklungUebersichtRecordSections preview={preview} orgEinheitQuery={{}} />);
    const headers = [
      screen.getByTestId("vereinsentwicklung-overview-strategien-list-header"),
      screen.getByTestId("vereinsentwicklung-overview-ziele-list-header"),
      screen.getByTestId("vereinsentwicklung-task-table-header"),
    ];
    for (const header of headers) {
      expect(header.className).toContain(SCE_CD_OVERVIEW_UNIFIED_GRID);
    }
  });

  it("renders long SCE references without reserving em dashes for empty tracks", () => {
    render(<VereinsentwicklungUebersichtRecordSections preview={preview} orgEinheitQuery={{}} />);
    expect(screen.getByText("SCE-001042")).toBeTruthy();
    expect(screen.getByText("SCE-1000001")).toBeTruthy();
    expect(screen.getByText("SCE-001051")).toBeTruthy();
    const reserved = screen.getAllByTestId(/reserved/);
    expect(reserved.length).toBeGreaterThan(0);
    for (const slot of reserved) {
      expect(slot.textContent).toBe("");
    }
    expect(screen.queryByText("—", { selector: "[data-sce-overview-reserved]" })).toBeNull();
  });

  it("shows mixed progress: Zielerreichung bar and empty Ziel delivery caption", () => {
    render(<VereinsentwicklungUebersichtRecordSections preview={preview} orgEinheitQuery={{}} />);
    expect(screen.getByTestId("overview-strategien-goal-progress-s1")).toBeTruthy();
    expect(screen.getByTestId("overview-ziele-task-progress-t1")).toBeTruthy();
    expect(screen.getByTestId("overview-task-progress-reserved-task-1")).toBeTruthy();
  });

  it("preserves orgEinheit on Alle anzeigen links", () => {
    render(
      <VereinsentwicklungUebersichtRecordSections
        preview={preview}
        orgEinheitQuery={{ [CD_WORKSPACE_ORG_UNIT_QUERY]: "ou-jun" }}
      />,
    );
    const href = screen.getByTestId("vereinsentwicklung-overview-aufgaben-all").getAttribute("href");
    expect(href).toContain(`${CD_WORKSPACE_ORG_UNIT_QUERY}=ou-jun`);
  });
});