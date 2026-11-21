/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskStatus } from "@prisma/client";
import VereinsentwicklungWorkspaceTaskStatusPill from "../VereinsentwicklungWorkspaceTaskStatusPill";
import VereinsentwicklungUebersichtRecordSections from "../VereinsentwicklungUebersichtRecordSections";
import type { VereinsentwicklungOverviewPreview } from "@/lib/club-development/vereinsentwicklung-overview-preview";
import { vereinsentwicklungTaskStatusBadgeClass } from "@/lib/club-development/vereinsentwicklung-task-status-presentation";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("VereinsentwicklungWorkspaceTaskStatusPill", () => {
  it("maps supported statuses to SCE semantic badge surfaces", () => {
    expect(vereinsentwicklungTaskStatusBadgeClass(TaskStatus.OPEN)).toContain("--sce-color-status-neutral");
    expect(vereinsentwicklungTaskStatusBadgeClass(TaskStatus.IN_PROGRESS)).toContain("--sce-color-status-info");
    expect(vereinsentwicklungTaskStatusBadgeClass(TaskStatus.DONE)).toContain("--sce-color-status-success");
    expect(vereinsentwicklungTaskStatusBadgeClass(TaskStatus.CANCELLED)).toContain("--muted");
    expect(vereinsentwicklungTaskStatusBadgeClass("WAITING")).toContain("--sce-color-status-warning");
  });

  it("renders green Erledigt pill with visible label", () => {
    render(<VereinsentwicklungWorkspaceTaskStatusPill status={TaskStatus.DONE} label="Erledigt" />);
    const pill = screen.getByText("Erledigt");
    expect(pill.className).toContain("--sce-success-light");
    expect(pill.className).toContain("--sce-color-status-success");
    expect(pill.textContent).toBe("Erledigt");
  });

  it("renders status pills on Übersicht Aufgaben rows", () => {
    const preview: VereinsentwicklungOverviewPreview = {
      showStrategien: false,
      showZiele: false,
      showAufgaben: true,
      strategies: [],
      targets: [],
      tasks: [
        {
          id: "task-done",
          title: "Test Aufgabe II",
          publicReference: null,
          status: TaskStatus.DONE,
          statusLabel: "Erledigt",
          assigneeLabels: [],
          targetId: "t1",
          targetTitle: "Testziel III",
        } as VereinsentwicklungOverviewPreview["tasks"][number],
        {
          id: "task-open",
          title: "Test Aufgabe I",
          publicReference: null,
          status: TaskStatus.OPEN,
          statusLabel: "Offen",
          assigneeLabels: [],
          targetId: "t1",
          targetTitle: "Testziel III",
        } as VereinsentwicklungOverviewPreview["tasks"][number],
      ],
    };
    render(<VereinsentwicklungUebersichtRecordSections preview={preview} orgEinheitQuery={{}} />);
    const erledigt = screen.getByText("Erledigt");
    expect(erledigt.className).toContain("--sce-color-status-success");
    const offen = screen.getByText("Offen");
    expect(offen.className).toContain("--sce-color-status-neutral");
  });
});