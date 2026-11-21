/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VereinsentwicklungUebersichtRecordSections from "../VereinsentwicklungUebersichtRecordSections";
import type { VereinsentwicklungOverviewPreview } from "@/lib/club-development/vereinsentwicklung-overview-preview";
import { TargetStatus, TaskStatus } from "@prisma/client";
import { SCE_CD_OVERVIEW_UNIFIED_GRID } from "../sce-club-development-surface-styles";
import {
  compareOverviewColumnOffsets,
  installOverviewGridLayoutMocks,
  SCE_CD_OVERVIEW_ALIGN_COLUMNS,
  assertOverviewHeadersShareGridTemplate,
} from "../vereinsentwicklung-overview-grid-alignment";

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

function buildPreview(
  overrides: Partial<VereinsentwicklungOverviewPreview> = {},
): VereinsentwicklungOverviewPreview {
  return {
    showStrategien: true,
    showZiele: true,
    showAufgaben: true,
    strategies: [
      {
        id: "s-populated",
        title: "Gesamtverein",
        publicReference: "SCE-001042",
        scopeOrgUnitLabel: "Junioren",
        createdAt: "2025-01-01",
        goalAchievementTotalCount: 3,
        goalAchievementCompletedCount: 2,
        goalAchievementCaption: "66%",
      } as VereinsentwicklungOverviewPreview["strategies"][number],
      {
        id: "s-empty",
        title: "Ohne Ziele",
        publicReference: null,
        scopeOrgUnitLabel: "Gesamtverein",
        createdAt: "2025-01-02",
        goalAchievementTotalCount: 0,
        goalAchievementCompletedCount: 0,
        goalAchievementCaption: "Noch keine Ziele",
      } as VereinsentwicklungOverviewPreview["strategies"][number],
    ],
    targets: [
      {
        id: "t-populated",
        title: "Testziel III",
        publicReference: "SCE-1000001",
        status: TargetStatus.ACTIVE,
        linkedClubStrategyTitle: "Gesamtverein",
        linkedClubStrategyId: "s-populated",
        orgUnitLabel: "Junioren",
        responsibleLabel: "M. Keller",
        deliveryProgressCaption: "66% – 2 von 3 erledigt",
      } as VereinsentwicklungOverviewPreview["targets"][number],
      {
        id: "t-empty",
        title: "Leeres Ziel",
        publicReference: "SCE-000009",
        status: TargetStatus.DRAFT,
        linkedClubStrategyTitle: null,
        linkedClubStrategyId: null,
        orgUnitLabel: null,
        responsibleLabel: null,
        deliveryProgressCaption: "Noch keine Aufgaben",
      } as VereinsentwicklungOverviewPreview["targets"][number],
    ],
    tasks: [
      {
        id: "task-1",
        title: "Test Aufgabe I",
        publicReference: "SCE-001051",
        status: TaskStatus.OPEN,
        statusLabel: "Offen",
        assigneeLabels: ["M. Keller"],
        targetId: "t-populated",
        targetTitle: "Testziel III",
      } as VereinsentwicklungOverviewPreview["tasks"][number],
      {
        id: "task-2",
        title: "Ohne Referenz",
        publicReference: null,
        status: TaskStatus.DONE,
        statusLabel: "Erledigt",
        assigneeLabels: ["S. Meier"],
        targetId: "t-empty",
        targetTitle: "Leeres Ziel",
      } as VereinsentwicklungOverviewPreview["tasks"][number],
    ],
    ...overrides,
  };
}

describe("VereinsentwicklungOverviewGridAlignment", () => {
  it("uses a single non-intrinsic grid template on all section headers", () => {
    const { container } = render(
      <VereinsentwicklungUebersichtRecordSections preview={buildPreview()} orgEinheitQuery={{}} />,
    );
    const headers = [
      screen.getByTestId("vereinsentwicklung-overview-strategien-list-header"),
      screen.getByTestId("vereinsentwicklung-overview-ziele-list-header"),
      screen.getByTestId("vereinsentwicklung-task-table-header"),
    ];
    for (const header of headers) {
      expect(header.className).toContain(SCE_CD_OVERVIEW_UNIFIED_GRID);
      expect(header.className).not.toContain("max-content");
    }
    expect(() => assertOverviewHeadersShareGridTemplate(headers)).not.toThrow();
  });

  it("aligns Kontext, Status, and Verantwortlich across sections with mixed progress rows", () => {
    const { container } = render(
      <VereinsentwicklungUebersichtRecordSections preview={buildPreview()} orgEinheitQuery={{}} />,
    );
    installOverviewGridLayoutMocks(container);

    expect(screen.getByTestId("overview-strategien-goal-progress-s-populated")).toBeTruthy();
    expect(screen.getByTestId("overview-task-progress-reserved-task-1")).toBeTruthy();

    for (const column of SCE_CD_OVERVIEW_ALIGN_COLUMNS) {
      const { aligned, lefts } = compareOverviewColumnOffsets(container, column);
      expect(lefts.length, `column ${column} markers`).toBeGreaterThanOrEqual(3);
      expect(aligned, `${column} offsets: ${lefts.join(", ")}`).toBe(true);
    }
  });

  it("keeps progress populated rows from shifting shared Kontext column markers", () => {
    const progressPreview = buildPreview({
      strategies: [
        {
          id: "s-wide",
          title: "Breiter Fortschritt",
          publicReference: "SCE-001042",
          scopeOrgUnitLabel: "Junioren",
          createdAt: "2025-01-01",
          goalAchievementTotalCount: 99,
          goalAchievementCompletedCount: 88,
          goalAchievementCaption: "88%",
        } as VereinsentwicklungOverviewPreview["strategies"][number],
      ],
      targets: [
        {
          id: "t-wide",
          title: "Ziel",
          publicReference: "SCE-1000001",
          status: TargetStatus.ACTIVE,
          linkedClubStrategyTitle: "Breiter Fortschritt",
          linkedClubStrategyId: "s-wide",
          orgUnitLabel: "Junioren",
          responsibleLabel: "M. Keller",
          deliveryProgressCaption: "88% – 88 von 99 erledigt",
        } as VereinsentwicklungOverviewPreview["targets"][number],
      ],
      tasks: buildPreview().tasks,
    });
    const { container } = render(
      <VereinsentwicklungUebersichtRecordSections preview={progressPreview} orgEinheitQuery={{}} />,
    );
    installOverviewGridLayoutMocks(container);
    const { aligned } = compareOverviewColumnOffsets(container, "kontext");
    expect(aligned).toBe(true);
  });
});