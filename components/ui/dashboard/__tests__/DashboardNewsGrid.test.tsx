/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardNewsSection } from "@/components/ui/dashboard/DashboardNewsGrid";
import type { CommandCenterNewsItem } from "@/lib/dashboard/command-center-presentation";

const newsItems: CommandCenterNewsItem[] = [
  {
    key: "news-1",
    id: "1",
    title: "Saisonstart bestätigt",
    excerpt: "Die neue Saison beginnt am Wochenende.",
    heroImageUrl: "https://cdn.example/news-1.jpg",
    heroImageAlt: "Saisonstart",
    publishedAtLabel: "08.09.2026",
    href: "/dashboard/website/news/1/edit",
  },
  {
    key: "news-2",
    id: "2",
    title: "Trainingszeiten aktualisiert",
    excerpt: null,
    heroImageUrl: null,
    heroImageAlt: null,
    publishedAtLabel: "07.09.2026",
    href: "/dashboard/website/news/2/edit",
  },
];

describe("DashboardNewsSection footer CTA", () => {
  it("renders a single footer CTA with the canonical news route in standalone mode", () => {
    render(<DashboardNewsSection items={newsItems} />);

    const footerLink = screen.getByRole("link", { name: "Alle News anzeigen →" });
    expect(footerLink).toHaveAttribute("href", "/dashboard/website/news");
    expect(screen.queryByRole("link", { name: "Alle News" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Alle News/i })).toHaveLength(1);
  });

  it("does not render an upper-right news list CTA when embedded", () => {
    render(<DashboardNewsSection items={newsItems} embedded variant="compact" maxItems={2} />);

    expect(screen.queryByRole("link", { name: /Alle News/i })).not.toBeInTheDocument();
    expect(screen.getByText("Saisonstart bestätigt")).toBeInTheDocument();
  });
});
