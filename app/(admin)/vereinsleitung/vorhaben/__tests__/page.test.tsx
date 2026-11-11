/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VorhabenAufgabenPage from "../page";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("/vereinsleitung/vorhaben page", () => {
  it("shows in-arbeit status and links to initiatives and tasks", () => {
    render(<VorhabenAufgabenPage />);
    expect(screen.getByText("In Arbeit")).toBeTruthy();
    expect(screen.getByText("Zu Initiativen")).toBeTruthy();
    expect(screen.getByText("Zu Aufgaben")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Zu Initiativen/i })).toHaveAttribute(
      "href",
      "/vereinsleitung/initiativen",
    );
    expect(screen.getByRole("link", { name: /Zu Aufgaben/i })).toHaveAttribute(
      "href",
      "/dashboard/aufgaben",
    );
  });
});
