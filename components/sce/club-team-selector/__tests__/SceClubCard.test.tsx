/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceClubCard } from "../SceClubCard";

describe("SceClubCard", () => {
  it("uses bare crest box and two-line club name contract", () => {
    render(
      <SceClubCard
        club={{
          id: "c1",
          name: "Basel International Football Club",
          shortName: null,
          alternativeName: null,
          logoUrl: "https://example.com/crest.png",
          status: "active",
          teamCount: 2,
        }}
        onSelect={() => {}}
      />,
    );
    const name = screen.getByText("Basel International Football Club");
    expect(name.className).toContain("line-clamp-2");
    expect(name.getAttribute("data-sce-club-name")).toBe("true");
    expect(document.querySelector('[data-sce-club-crest-box="true"]')).toBeTruthy();
    const img = document.querySelector("img");
    expect(img?.className).not.toContain("rounded-full");
    expect(img?.className).toContain("object-contain");
  });
});
