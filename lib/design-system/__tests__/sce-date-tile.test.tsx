/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { formatSceDateTileParts } from "@/lib/design-system/sce-date-tile";
import { render, screen } from "@testing-library/react";
import { SceDateTile } from "@/components/design-system/date";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

describe("SCE-DS2-DATE-01 — formatSceDateTileParts", () => {
  it("formats Tuesday 17 November 2026 in Europe/Zurich", () => {
    const parts = formatSceDateTileParts(new Date("2026-11-17T12:00:00.000Z"), FMT);
    expect(parts.weekdayShort).toBe("DI");
    expect(parts.day).toBe("17");
    expect(parts.monthShort).toMatch(/NOV/);
    expect(parts.accessibleLabel).toMatch(/2026/);
  });

  it("keeps date-only YYYY-MM-DD stable across month boundaries", () => {
    const parts = formatSceDateTileParts({ dateOnly: "2026-03-01" }, FMT);
    expect(parts.day).toBe("1");
    expect(parts.monthShort).toMatch(/MÄR|MAR/);
  });

  it("does not shift date-only keys on DST spring forward", () => {
    const parts = formatSceDateTileParts({ dateOnly: "2026-03-29" }, FMT);
    expect(parts.day).toBe("29");
  });

  it("handles leap-year Feb 29 as date-only", () => {
    const parts = formatSceDateTileParts({ dateOnly: "2028-02-29" }, FMT);
    expect(parts.day).toBe("29");
    expect(parts.monthShort).toMatch(/FEB/);
  });

  it("year boundary: Dec 31 and Jan 1", () => {
    const dec = formatSceDateTileParts({ dateOnly: "2025-12-31" }, FMT);
    const jan = formatSceDateTileParts({ dateOnly: "2026-01-01" }, FMT);
    expect(dec.monthShort).toMatch(/DEZ/);
    expect(jan.monthShort).toMatch(/JAN/);
  });
});

describe("SCE-DS2-DATE-01 — SceDateTile component", () => {
  it("exposes accessible label by default", () => {
    render(<SceDateTile value={new Date("2026-11-17T12:00:00.000Z")} fmtCfg={FMT} />);
    const tile = screen.getByTestId("sce-date-tile");
    expect(tile).toHaveAttribute("aria-label");
    expect(tile.getAttribute("aria-label")).toMatch(/2026/);
  });

  it("supports decorative mode without aria-label", () => {
    render(
      <SceDateTile value={new Date("2026-11-17T12:00:00.000Z")} fmtCfg={FMT} decorative />,
    );
    expect(screen.getByTestId("sce-date-tile")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders compact and default size markers", () => {
    const { rerender } = render(
      <SceDateTile value={{ dateOnly: "2026-11-17" }} fmtCfg={FMT} size="compact" />,
    );
    expect(screen.getByTestId("sce-date-tile")).toHaveAttribute("data-sce-date-tile-size", "compact");
    rerender(<SceDateTile value={{ dateOnly: "2026-11-17" }} fmtCfg={FMT} size="default" />);
    expect(screen.getByTestId("sce-date-tile")).toHaveAttribute("data-sce-date-tile-size", "default");
  });
});
