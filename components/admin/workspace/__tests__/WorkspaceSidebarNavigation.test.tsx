/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("hub=recent"),
}));

import { WorkspaceSidebarNavigation } from "@/components/admin/workspace/WorkspaceSidebarNavigation";

describe("WorkspaceSidebarNavigation", () => {
  it("links recent and favorites in work section", () => {
    render(
      <WorkspaceSidebarNavigation>
        <div data-testid="tree">tree</div>
      </WorkspaceSidebarNavigation>,
    );
    expect(screen.getByText("Workspace.navigation.recent")).toBeInTheDocument();
    expect(screen.getByText("Workspace.navigation.favorites")).toBeInTheDocument();
    expect(screen.getByText("Workspace.lifecycle.archived")).toBeInTheDocument();
    expect(screen.getByText("Workspace.lifecycle.trash")).toBeInTheDocument();
    expect(screen.getByTestId("tree")).toBeInTheDocument();
  });
});
