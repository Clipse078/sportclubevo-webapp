/**
 * @vitest-environment jsdom
 *
 * SCE-DS2-05B-R10 — tenant crest rendering, fallback, and tenant switching.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TenantLogo from "@/components/admin/branding/TenantLogo";
import { headerCrestBox } from "@/lib/branding/sce-header-crest-layout";

describe("TenantLogo header crest", () => {
  it("renders the tenant crest and keeps its box when a logo URL is present", () => {
    render(
      <TenantLogo
        logoUrl="/crests/cham.svg"
        size={38}
        alt="SC Cham Logo"
        variant="header-crest"
        displayName="SC Cham"
      />,
    );

    const slot = screen.getByTestId("tenant-header-crest");
    const image = screen.getByTestId("tenant-logo-image");
    expect(slot).toHaveClass("sce-tenant-header-crest");
    expect(slot).toHaveStyle({
      flex: headerCrestBox(38).flex,
      width: "38px",
      height: "38px",
      minWidth: "38px",
      maxWidth: "38px",
    });
    expect(image).toHaveAttribute("src", "/crests/cham.svg");
    expect(image).toHaveAttribute("alt", "SC Cham Logo");
    expect(image.parentElement).toBe(slot);
    expect(
      screen.queryByTestId("tenant-logo-header-initials"),
    ).not.toBeInTheDocument();
  });

  it("falls back to initials when the logo URL is missing or invalid", () => {
    const { rerender } = render(
      <TenantLogo
        logoUrl={null}
        size={38}
        variant="header-crest"
        displayName="SC Cham"
      />,
    );
    expect(screen.queryByTestId("tenant-logo-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("tenant-logo-header-initials")).toHaveTextContent(
      "SC",
    );
    expect(screen.getByTestId("tenant-header-crest")).toHaveStyle({
      width: "38px",
      minWidth: "38px",
    });

    rerender(
      <TenantLogo
        logoUrl="not-a-url"
        size={38}
        variant="header-crest"
        displayName="Union"
      />,
    );
    expect(screen.getByTestId("tenant-logo-header-initials")).toHaveTextContent(
      "UN",
    );
  });

  it("replaces a broken logo with initials inside the same crest box", () => {
    render(
      <TenantLogo
        logoUrl="https://cdn.example/missing-crest.png"
        size={38}
        variant="header-crest"
        displayName="FC Riehen"
      />,
    );
    fireEvent.error(screen.getByTestId("tenant-logo-image"));
    expect(screen.queryByTestId("tenant-logo-image")).not.toBeInTheDocument();
    const initials = screen.getByTestId("tenant-logo-header-initials");
    expect(initials).toHaveTextContent("FR");
    expect(initials.parentElement).toHaveStyle({
      width: "38px",
      height: "38px",
      flex: "0 0 auto",
    });
  });

  it("switches crest and name data when the tenant changes", () => {
    const { rerender } = render(
      <TenantLogo
        logoUrl="/crests/cham.svg"
        size={38}
        alt="SC Cham Logo"
        variant="header-crest"
        displayName="SC Cham"
      />,
    );
    expect(screen.getByTestId("tenant-logo-image")).toHaveAttribute(
      "src",
      "/crests/cham.svg",
    );

    rerender(
      <TenantLogo
        logoUrl="https://cdn.example/riehen.png"
        size={38}
        alt="FC Riehen Logo"
        variant="header-crest"
        displayName="FC Riehen"
      />,
    );
    expect(screen.getByTestId("tenant-logo-image")).toHaveAttribute(
      "src",
      "https://cdn.example/riehen.png",
    );
    expect(screen.getByTestId("tenant-logo-image")).toHaveAttribute(
      "alt",
      "FC Riehen Logo",
    );

    rerender(
      <TenantLogo
        logoUrl={null}
        size={38}
        variant="header-crest"
        displayName="FC Riehen"
      />,
    );
    expect(screen.getByTestId("tenant-logo-header-initials")).toHaveTextContent(
      "FR",
    );
  });
});
