/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeineAufgabenWidget } from "@/components/ui/dashboard/MeineAufgabenWidget";

describe("MeineAufgabenWidget — AUFGABEN-04NB", () => {
  it("shows positive empty state copy for authorized users with no tasks", () => {
    render(<MeineAufgabenWidget previewItems={[]} />);

    expect(screen.getByText("Keine offenen Aufgaben")).toBeInTheDocument();
    expect(screen.getByText("Aktuell ist nichts für dich offen.")).toBeInTheDocument();
    expect(screen.queryByText("Aufgaben nicht verfügbar")).not.toBeInTheDocument();
  });

  it("links tasks to canonical workspace routes", () => {
    render(
      <MeineAufgabenWidget
        previewItems={[
          {
            id: "task-42",
            title: "Material bestellen",
            dueAt: "2026-03-01T10:00:00.000Z",
            parentTitle: null,
          },
        ]}
      />,
    );

    const taskLink = screen.getByRole("link", { name: "Material bestellen" });
    expect(taskLink).toHaveAttribute("href", "/dashboard/aufgaben/task-42");

    const allLink = screen.getByRole("link", { name: "Alle Aufgaben →" });
    expect(allLink).toHaveAttribute("href", "/dashboard/aufgaben");
  });
});
