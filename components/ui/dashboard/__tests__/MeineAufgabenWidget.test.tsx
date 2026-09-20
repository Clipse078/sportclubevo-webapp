/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeineAufgabenWidget } from "@/components/ui/dashboard/MeineAufgabenWidget";

describe("MeineAufgabenWidget — AUFGABEN-05-UI", () => {
  it("shows polished empty state copy", () => {
    render(<MeineAufgabenWidget previewItems={[]} />);

    expect(screen.getByText("Alles erledigt")).toBeInTheDocument();
    expect(
      screen.getByText("Aktuell gibt es keine offenen Aufgaben oder Rückmeldungen."),
    ).toBeInTheDocument();
  });

  it("links tasks to canonical workspace routes and inbox for overview", () => {
    render(
      <MeineAufgabenWidget
        previewItems={[
          {
            id: "task-42",
            title: "Material bestellen",
            metaLine: "Heute",
            href: "/dashboard/aufgaben/task-42",
          },
          {
            id: "att-1",
            title: "Teilnahme für James bestätigen",
            subtitle: "Training F2 · F2",
            metaLine: "Mo., 21. Sep. · 17:00",
            href: null,
          },
        ]}
      />,
    );

    const taskLink = screen.getByRole("link", { name: /Material bestellen/ });
    expect(taskLink).toHaveAttribute("href", "/dashboard/aufgaben/task-42");

    const allLink = screen.getByRole("link", { name: "Alle anzeigen →" });
    expect(allLink).toHaveAttribute("href", "/dashboard/aufgaben?bereich=meine");
  });
});
