/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  measureActivityContentClipping,
  resolveActivityClippedDetailOffer,
  shouldOfferActivityClippedDetailDisclosure,
} from "../activity-clipped-detail";

describe("activity-clipped-detail DOM measurement (08-07R1)", () => {
  it("detects ellipsis overflow on truncate nodes", () => {
    const root = document.createElement("div");
    Object.defineProperty(root, "clientWidth", { value: 80, configurable: true });
    Object.defineProperty(root, "clientHeight", { value: 64, configurable: true });

    const line = document.createElement("span");
    line.className = "truncate";
    Object.defineProperty(line, "clientWidth", { value: 60, configurable: true });
    Object.defineProperty(line, "scrollWidth", { value: 140, configurable: true });
    Object.defineProperty(line, "clientHeight", { value: 12, configurable: true });
    Object.defineProperty(line, "scrollHeight", { value: 12, configurable: true });
    root.appendChild(line);

    const clipping = measureActivityContentClipping(root);
    expect(clipping.contentOverflow).toBe(true);
    expect(
      resolveActivityClippedDetailOffer(
        { compact: false, blockWidthPx: 240, blockHeightPx: 72 },
        clipping,
      ),
    ).toBe(true);
  });

  it("uses layoutWidthPx when CSS width is calc() and unparsable", () => {
    expect(
      shouldOfferActivityClippedDetailDisclosure({
        compact: true,
        blockWidthPx: 240,
        blockHeightPx: 90,
        layoutWidthPx: 58,
        layoutHeightPx: 90,
      }),
    ).toBe(true);
  });

  it("skips disclosure when layout and DOM show full content", () => {
    const root = document.createElement("div");
    Object.defineProperty(root, "clientWidth", { value: 220, configurable: true });
    Object.defineProperty(root, "clientHeight", { value: 80, configurable: true });
    const line = document.createElement("span");
    line.className = "truncate";
    Object.defineProperty(line, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(line, "scrollWidth", { value: 120, configurable: true });
    Object.defineProperty(line, "clientHeight", { value: 12, configurable: true });
    Object.defineProperty(line, "scrollHeight", { value: 12, configurable: true });
    root.appendChild(line);

    const clipping = measureActivityContentClipping(root);
    expect(
      resolveActivityClippedDetailOffer(
        {
          compact: false,
          blockWidthPx: 240,
          blockHeightPx: 80,
          layoutWidthPx: 220,
          layoutHeightPx: 80,
        },
        clipping,
      ),
    ).toBe(false);
  });
});
