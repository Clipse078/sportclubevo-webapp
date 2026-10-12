/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildNameOnlyClubIdentity } from "@/lib/sporting-activity-design";
import { ClubCrest } from "../ClubCrest";

describe("ClubCrest accessibility", () => {
  it("shows initials fallback when logo missing", () => {
    const identity = buildNameOnlyClubIdentity("FC Binningen");
    render(<ClubCrest identity={identity} />);
    expect(screen.getByTestId("club-crest-fallback-initials")).toHaveTextContent("FB");
    expect(screen.getByLabelText("FC Binningen")).toBeInTheDocument();
  });

  it("reverts to fallback when image fails to load", () => {
    const identity = buildNameOnlyClubIdentity("FC Example");
    identity.logoUrl = "https://cdn.example.com/broken.png";
    render(<ClubCrest identity={identity} />);
    const img = screen.getByTestId("club-crest-image");
    fireEvent.error(img);
    expect(screen.getByTestId("club-crest-fallback-initials")).toBeInTheDocument();
  });

  it("uses empty alt when decorative", () => {
    const identity = buildNameOnlyClubIdentity("FC Example");
    identity.logoUrl = "https://cdn.example.com/ok.png";
    render(<ClubCrest identity={identity} decorative />);
    expect(screen.getByTestId("club-crest-image")).toHaveAttribute("alt", "");
  });

  it("uses object-contain without circular pill for real crest images", () => {
    const identity = buildNameOnlyClubIdentity("FC Example");
    identity.logoUrl = "https://cdn.example.com/ok.png";
    render(<ClubCrest identity={identity} />);
    const img = screen.getByTestId("club-crest-image");
    expect(img.className).toContain("object-contain");
    expect(img.className).not.toContain("rounded-full");
    expect(screen.getByTestId("club-crest-bounds").className).not.toContain("rounded-full");
  });

  it("does not show initials while a real crest URL is present (only the image)", () => {
    const identity = buildNameOnlyClubIdentity("FC Example");
    identity.logoUrl = "https://cdn.example.com/ok.png";
    render(<ClubCrest identity={identity} />);
    expect(screen.getByTestId("club-crest-image")).toBeInTheDocument();
    expect(screen.queryByTestId("club-crest-fallback-initials")).toBeNull();
  });

  it("keeps circular treatment for missing-logo fallback only", () => {
    const identity = buildNameOnlyClubIdentity("FC Binningen");
    render(<ClubCrest identity={identity} />);
    expect(screen.getByTestId("club-crest-fallback-initials").className).toContain(
      "rounded-full",
    );
  });
});
