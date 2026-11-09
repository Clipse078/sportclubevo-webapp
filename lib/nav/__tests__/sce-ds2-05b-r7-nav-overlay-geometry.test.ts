/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import {
  SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_PX,
  SCE_DOMAIN_NAV_OVERLAY_VIEWPORT_GAP_PX,
  computeDomainNavOverlayGeometry,
  domainNavOverlayStyle,
  overlayGeometriesEqual,
  resolveDomainNavOverlayAnchorBottom,
  resolveDomainNavOverlayPortalTarget,
  resolveDomainNavOverlayTheme,
} from "@/lib/nav/sce-domain-nav-overlay-geometry";

describe("SCE-DS2-05B-R7 overlay geometry", () => {
  it("anchors top to the primary-row bottom and never reads panel height", () => {
    const viewport = 768;
    const anchorBottom = 88;
    const first = computeDomainNavOverlayGeometry(anchorBottom, viewport);
    const afterPanelGrowth = computeDomainNavOverlayGeometry(anchorBottom, viewport);
    const afterPanelShrink = computeDomainNavOverlayGeometry(anchorBottom, viewport);

    expect(first.top).toBe(88);
    expect(first.maxHeight).toBe(
      Math.min(
        SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_PX,
        viewport - 88 - SCE_DOMAIN_NAV_OVERLAY_VIEWPORT_GAP_PX,
      ),
    );
    expect(afterPanelGrowth).toEqual(first);
    expect(afterPanelShrink).toEqual(first);
  });

  it("does not oscillate when invoked repeatedly with a stable anchor", () => {
    const samples = Array.from({ length: 40 }, () =>
      computeDomainNavOverlayGeometry(72, 900),
    );
    const unique = new Set(samples.map((sample) => `${sample.top}:${sample.maxHeight}`));
    expect(unique.size).toBe(1);
    expect(samples[0]?.top).toBe(72);
  });

  it("clamps max-height to remaining viewport space on short laptop heights", () => {
    const geometry = computeDomainNavOverlayGeometry(96, 480);
    expect(geometry.maxHeight).toBe(480 - 96 - SCE_DOMAIN_NAV_OVERLAY_VIEWPORT_GAP_PX);
    expect(geometry.maxHeight).toBeLessThan(SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_PX);
  });

  it("clamps max-height to 26rem on tall viewports", () => {
    const geometry = computeDomainNavOverlayGeometry(80, 1080);
    expect(geometry.maxHeight).toBe(SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_PX);
  });

  it("emits CSS max-height from the anchor, not from overlay content", () => {
    const geometry = computeDomainNavOverlayGeometry(72, 900);
    const style = domainNavOverlayStyle(geometry);
    expect(style.top).toBe("72px");
    expect(style["--sce-domain-nav-overlay-max-height"]).toContain("72px");
    expect(style["--sce-domain-nav-overlay-max-height"]).toContain("26rem");
    expect(style["--sce-domain-nav-overlay-max-height"]).not.toMatch(/header\.getBoundingClientRect/);
  });

  it("keeps identical geometry objects stable for idle overlay frames", () => {
    const a = computeDomainNavOverlayGeometry(64, 1440);
    const b = computeDomainNavOverlayGeometry(64, 1440);
    expect(overlayGeometriesEqual(a, b)).toBe(true);
    expect(overlayGeometriesEqual(null, b)).toBe(false);
  });

  it("reads a zero-height overlay anchor as the primary-row bottom", () => {
    const header = document.createElement("header");
    const anchor = document.createElement("div");
    anchor.setAttribute("data-sce-domain-nav-overlay-anchor", "");
    header.append(anchor);
    Object.defineProperty(anchor, "getBoundingClientRect", {
      value: () => ({
        top: 72,
        bottom: 72,
        height: 0,
        left: 0,
        right: 1366,
        width: 1366,
        x: 0,
        y: 72,
        toJSON() {
          return this;
        },
      }),
    });
    expect(resolveDomainNavOverlayAnchorBottom(header)).toBe(72);
  });

  it("prefers the authenticated shell as portal target and copies its theme", () => {
    const shell = document.createElement("div");
    shell.className = "sce-authenticated-app-shell";
    shell.setAttribute("data-sce-theme", "white");
    const header = document.createElement("header");
    shell.append(header);
    document.body.append(shell);
    expect(resolveDomainNavOverlayPortalTarget(header)).toBe(shell);
    expect(resolveDomainNavOverlayTheme(header)).toBe("white");
    shell.remove();
    expect(resolveDomainNavOverlayPortalTarget(null)).toBe(document.body);
  });
});
