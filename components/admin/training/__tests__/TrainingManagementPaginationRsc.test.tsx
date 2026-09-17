/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrainingManagementPagination from "@/components/admin/training/TrainingManagementPagination";
import { buildTrainingManagementPaginationNavigation } from "@/lib/training/management-pagination";

const ROOT = resolve(__dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("TRAININGS-UX-01J1 pagination RSC boundary", () => {
  it("TrainingManagementPagination is a Server Component (no use client)", () => {
    const source = readSource("components/admin/training/TrainingManagementPagination.tsx");
    expect(source).not.toMatch(/^"use client"/m);
    expect(source).not.toContain("buildPageHref");
  });

  it("workspace does not pass function-valued pagination props into the tree", () => {
    const source = readSource("components/admin/training/TrainingManagementWorkspace.tsx");
    expect(source).not.toContain("buildPageHref");
    expect(source).toContain("navigation={paginationNavigation}");
  });

  it("renders pagination from serializable navigation without runtime function props", () => {
    const navigation = buildTrainingManagementPaginationNavigation(
      { seriesSearch: "abc", archived: false },
      "UPDATED_DESC",
      2,
      6,
    );

    render(
      <TrainingManagementPagination
        page={2}
        pageCount={6}
        rangeStart={11}
        rangeEnd={20}
        totalCount={56}
        navigation={navigation}
      />,
    );

    expect(screen.getByTestId("training-management-pagination")).toBeInTheDocument();
    expect(screen.getByText("11–20 von 56 Trainings")).toBeInTheDocument();
    expect(screen.getByLabelText("Seite 2")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Vorherige Seite")).toHaveAttribute("href", navigation.previousHref!);
    expect(screen.getByLabelText("Nächste Seite")).toHaveAttribute("href", navigation.nextHref!);
  });
});
