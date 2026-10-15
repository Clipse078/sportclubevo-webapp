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
  it("stacks tenant above secondary product wordmark for mobile row-1 without horizontal separator", () => {
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

    const wordmark = screen.getAllByTestId("sce-product-wordmark")[0]!;
    const tenantRow = screen.getAllByText("FC Allschwil")[0]!;
    expect(stack.contains(wordmark)).toBe(true);
    expect(stack.contains(tenantRow)).toBe(true);
    expect(
      tenantRow.compareDocumentPosition(wordmark) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
