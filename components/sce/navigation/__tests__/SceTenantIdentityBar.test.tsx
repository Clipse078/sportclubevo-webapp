/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceTenantIdentityBar } from "@/components/sce/navigation/SceTenantIdentityBar";

vi.mock("@/components/admin/branding/SidebarPlatformBrand", () => ({
  default: () => <div data-testid="sce-product-wordmark">SportClubEvo</div>,
}));

vi.mock("@/components/admin/branding/TenantLogo", () => ({
  default: () => <div data-testid="tenant-crest" />,
}));

describe("SceTenantIdentityBar brand hierarchy", () => {
  it("keeps tenant-first mobile stack without secondary platform wordmark for club workspaces", () => {
    render(
      <SceTenantIdentityBar
        displayClubName="FC Allschwil"
        logoUrl="/crest.png"
        platformWorkspace={false}
      />,
    );

    const stack = screen.getByTestId("sce-tenant-identity-bar");
    expect(stack).toHaveAttribute("data-tenant-primary", "true");
    expect(stack).toHaveClass("sce-global-brand-tenant-stack");
    expect(screen.queryByTestId("sce-product-tenant-separator")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-platform-brand-rail")).not.toBeInTheDocument();
    expect(screen.getAllByText("FC Allschwil").length).toBeGreaterThan(0);
  });

  it("still shows platform wordmark for platform workspace mobile stack", () => {
    render(
      <SceTenantIdentityBar
        displayClubName="Platform"
        platformWorkspace
      />,
    );
    expect(screen.getByTestId("sce-platform-brand-rail")).toBeTruthy();
  });
});
