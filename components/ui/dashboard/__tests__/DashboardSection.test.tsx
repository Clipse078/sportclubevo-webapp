/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarDays, Zap } from "lucide-react";
import { DashboardSection } from "@/components/ui/dashboard/DashboardSection";

describe("DashboardSection section icons", () => {
  it("renders Schnellaktionen with an orange accent icon container", () => {
    const { container } = render(
      <DashboardSection
        title="Schnellaktionen"
        icon={<Zap className="h-4 w-4" data-testid="quick-actions-icon" />}
        iconAccent="primary"
      >
        <p>Inhalt</p>
      </DashboardSection>,
    );

    expect(screen.getByRole("heading", { name: "Schnellaktionen" })).toBeInTheDocument();
    expect(screen.getByTestId("quick-actions-icon")).toBeInTheDocument();
    expect(container.innerHTML).toContain("var(--sce-primary-light)");
  });

  it("renders Nächste Termine with a blue accent icon container", () => {
    const { container } = render(
      <DashboardSection
        title="Nächste Termine"
        icon={<CalendarDays className="h-4 w-4" data-testid="upcoming-icon" />}
        iconAccent="info"
      >
        <p>Inhalt</p>
      </DashboardSection>,
    );

    expect(screen.getByRole("heading", { name: "Nächste Termine" })).toBeInTheDocument();
    expect(screen.getByTestId("upcoming-icon")).toBeInTheDocument();
    expect(container.innerHTML).toContain("var(--sce-info-light)");
  });
});
