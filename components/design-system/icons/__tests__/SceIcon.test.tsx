/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceIcon } from "../SceIcon";

describe("SceIcon", () => {
  it("renders approved dashboard master at 24px with 64×64 viewBox", () => {
    const { container } = render(<SceIcon name="dashboard" size={24} />);
    const svg = container.querySelector("svg.sce-icon");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
    expect(svg).toHaveAttribute("viewBox", "0 0 64 64");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders provisional glyphs with 24×24 viewBox", () => {
    const { container } = render(<SceIcon name="search" size={24} />);
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("supports compact and hero render sizes", () => {
    const { container: c16 } = render(<SceIcon name="search" size={16} />);
    expect(c16.querySelector("svg")).toHaveAttribute("width", "16");

    const { container: c20 } = render(<SceIcon name="search" size={20} />);
    expect(c20.querySelector("svg")).toHaveAttribute("width", "20");

    const { container: c48 } = render(<SceIcon name="training" size={48} />);
    expect(c48.querySelector("svg")).toHaveAttribute("width", "48");
    expect(c48.querySelector("svg")).toHaveAttribute("viewBox", "0 0 64 64");
  });

  it("forwards className to the svg", () => {
    const { container } = render(
      <SceIcon name="close" className="test-icon-class" />,
    );
    expect(container.querySelector("svg")).toHaveClass("test-icon-class");
  });

  it("exposes title when provided", () => {
    render(<SceIcon name="settings" title="Einstellungen" />);
    expect(screen.getByTitle("Einstellungen")).toBeInTheDocument();
  });

  it("fail-safe unknown icon name", () => {
    const { container } = render(
      // @ts-expect-error intentional unknown name for runtime guard
      <SceIcon name="not-a-real-sce-icon" />,
    );
    expect(container.querySelector("[data-sce-icon-missing]")).toBeTruthy();
  });
});
