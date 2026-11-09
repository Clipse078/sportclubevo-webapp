/**
 * @vitest-environment jsdom
 *
 * SCE-DS2-05B-R10 — desktop tenant identity: crest beside the club name.
 */

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HeaderTenantIdentity from "@/components/admin/layout/HeaderTenantIdentity";
import { SceTenantContextRail } from "@/components/sce/navigation/SceTenantIdentityBar";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Header tenant identity", () => {
  it("places the crest before the uppercase italic club name", () => {
    render(
      <HeaderTenantIdentity
        tenantName="SC Cham"
        logoUrl="/crests/cham.svg"
        layout="tenant-header-primary"
        homeHref="/dashboard"
      />,
    );

    const link = screen.getByTestId("sce-tenant-home-link");
    const crest = screen.getByTestId("tenant-header-crest");
    const name = screen.getByText("SC Cham");
    expect(link).toHaveAttribute("data-tenant-layout", "tenant-header-primary");
    expect(name).toHaveClass("sce-tenant-header-identity-name");
    expect(
      crest.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId("tenant-logo-image")).toHaveAttribute(
      "src",
      "/crests/cham.svg",
    );
  });

  it("switches the desktop rail when the tenant changes and falls back without a logo", () => {
    const { rerender } = render(
      <SceTenantContextRail
        displayClubName="SC Cham"
        logoUrl="/crests/cham.svg"
        platformWorkspace={false}
        homeHref="/dashboard"
      />,
    );
    expect(screen.getByText("SC Cham")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-logo-image")).toHaveAttribute(
      "src",
      "/crests/cham.svg",
    );

    rerender(
      <SceTenantContextRail
        displayClubName="FC Riehen"
        logoUrl="https://cdn.example/riehen.png"
        platformWorkspace={false}
        homeHref="/dashboard"
      />,
    );
    expect(screen.getByText("FC Riehen")).toBeInTheDocument();
    expect(screen.queryByText("SC Cham")).not.toBeInTheDocument();
    expect(screen.getByTestId("tenant-logo-image")).toHaveAttribute(
      "src",
      "https://cdn.example/riehen.png",
    );

    rerender(
      <SceTenantContextRail
        displayClubName="FC Riehen"
        logoUrl={null}
        platformWorkspace={false}
        homeHref="/dashboard"
      />,
    );
    expect(screen.getByTestId("tenant-logo-header-initials")).toHaveTextContent(
      "FR",
    );
    expect(screen.queryByTestId("tenant-logo-image")).not.toBeInTheDocument();
  });
});
