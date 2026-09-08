import { describe, expect, it } from "vitest";
import {
  DEFAULT_HERO_TRANSFORM,
  HERO_MAX_ZOOM,
  HERO_MIN_ZOOM,
  applyPanDelta,
  applyZoomAtAnchor,
  clampOffset,
  clampPosition,
  clampZoom,
  getCoverScale,
  getHeroRenderState,
  getOffsetBounds,
  getScaledDimensions,
  hasBlankSpace,
  nudgePosition,
  offsetToPosition,
  positionToOffset,
} from "@/lib/dashboard/dashboard-hero-position";

const viewport = { width: 800, height: 200 };
const wideViewport = { width: 400, height: 200 };
const landscapeImage = { width: 1600, height: 900 };
const portraitImage = { width: 900, height: 1600 };
const panoramicImage = { width: 2000, height: 500 };

describe("dashboard-hero-position", () => {
  describe("getCoverScale", () => {
    it("uses the larger axis scale for object-cover", () => {
      expect(getCoverScale(viewport, landscapeImage)).toBeCloseTo(800 / 1600);
      expect(getCoverScale(viewport, portraitImage)).toBeCloseTo(800 / 900);
    });
  });

  describe("getScaledDimensions", () => {
    it("never renders smaller than the viewport at minimum zoom", () => {
      const scaled = getScaledDimensions(viewport, landscapeImage, HERO_MIN_ZOOM);
      expect(scaled.width).toBeGreaterThanOrEqual(viewport.width);
      expect(scaled.height).toBeGreaterThanOrEqual(viewport.height);
    });

    it("scales up with zoom", () => {
      const base = getScaledDimensions(viewport, landscapeImage, 1);
      const zoomed = getScaledDimensions(viewport, landscapeImage, 2);
      expect(zoomed.width).toBeCloseTo(base.width * 2);
      expect(zoomed.height).toBeCloseTo(base.height * 2);
    });
  });

  describe("clampOffset", () => {
    it("prevents blank horizontal space for wide cover images", () => {
      const scaled = getScaledDimensions(wideViewport, panoramicImage, 1);
      const bounds = getOffsetBounds(wideViewport, scaled);

      expect(bounds.maxX).toBe(0);
      expect(bounds.minX).toBeLessThan(0);

      const tooFarLeft = clampOffset(wideViewport, scaled, { x: 50, y: 0 });
      expect(tooFarLeft.x).toBe(0);

      const tooFarRight = clampOffset(wideViewport, scaled, { x: bounds.minX - 100, y: 0 });
      expect(tooFarRight.x).toBe(bounds.minX);
    });

    it("prevents blank vertical space for tall cover images", () => {
      const scaled = getScaledDimensions(viewport, portraitImage, 1);
      const bounds = getOffsetBounds(viewport, scaled);

      const tooFarUp = clampOffset(viewport, scaled, { x: 0, y: 40 });
      expect(tooFarUp.y).toBe(0);

      const tooFarDown = clampOffset(viewport, scaled, { x: 0, y: bounds.minY - 50 });
      expect(tooFarDown.y).toBe(bounds.minY);
    });
  });

  describe("normalized focal point round-trip", () => {
    it("maps center to centered offset", () => {
      const offset = positionToOffset(viewport, landscapeImage, DEFAULT_HERO_TRANSFORM);
      const scaled = getScaledDimensions(viewport, landscapeImage, 1);
      expect(offset.x).toBeCloseTo((viewport.width - scaled.width) / 2);
      expect(offset.y).toBeCloseTo((viewport.height - scaled.height) / 2);
    });

    it("round-trips position through offset conversion", () => {
      const transform = { positionX: 0.25, positionY: 0.75, zoom: 1.5 };
      const offset = positionToOffset(viewport, landscapeImage, transform);
      const roundTrip = offsetToPosition(viewport, landscapeImage, offset, transform.zoom);
      expect(roundTrip.positionX).toBeCloseTo(transform.positionX);
      expect(roundTrip.positionY).toBeCloseTo(transform.positionY);
    });
  });

  describe("getHeroRenderState", () => {
    it("never produces blank space at edges", () => {
      const transforms = [
        DEFAULT_HERO_TRANSFORM,
        { positionX: 0, positionY: 0, zoom: 1 },
        { positionX: 1, positionY: 1, zoom: HERO_MAX_ZOOM },
      ];

      for (const transform of transforms) {
        const state = getHeroRenderState(viewport, landscapeImage, transform);
        expect(
          hasBlankSpace(
            viewport,
            { width: state.scaledWidth, height: state.scaledHeight },
            state.offset,
          ),
        ).toBe(false);
      }
    });
  });

  describe("applyZoomAtAnchor", () => {
    it("clamps zoom to configured range", () => {
      expect(clampZoom(0.5)).toBe(HERO_MIN_ZOOM);
      expect(clampZoom(5)).toBe(HERO_MAX_ZOOM);
    });

    it("preserves viewport-center content when zooming in", () => {
      const start = DEFAULT_HERO_TRANSFORM;
      const startState = getHeroRenderState(viewport, landscapeImage, start);
      const anchor = { x: viewport.width / 2, y: viewport.height / 2 };
      const startImageX =
        landscapeImage.width *
        ((anchor.x - startState.offset.x) / startState.scaledWidth);
      const startImageY =
        landscapeImage.height *
        ((anchor.y - startState.offset.y) / startState.scaledHeight);

      const zoomed = applyZoomAtAnchor(viewport, landscapeImage, start, 2, anchor);
      const zoomedState = getHeroRenderState(viewport, landscapeImage, zoomed);
      const endImageX =
        landscapeImage.width *
        ((anchor.x - zoomedState.offset.x) / zoomedState.scaledWidth);
      const endImageY =
        landscapeImage.height *
        ((anchor.y - zoomedState.offset.y) / zoomedState.scaledHeight);

      expect(endImageX).toBeCloseTo(startImageX, 0);
      expect(endImageY).toBeCloseTo(startImageY, 0);
    });
  });

  describe("applyPanDelta", () => {
    it("clamps pan so no blank space appears", () => {
      const atEdge = { positionX: 0, positionY: 0.5, zoom: 1 };
      const panned = applyPanDelta(wideViewport, panoramicImage, atEdge, { x: 80, y: 0 });
      const state = getHeroRenderState(wideViewport, panoramicImage, panned);
      expect(
        hasBlankSpace(
          wideViewport,
          { width: state.scaledWidth, height: state.scaledHeight },
          state.offset,
        ),
      ).toBe(false);
      expect(panned.positionX).toBe(0);
    });
  });

  describe("nudgePosition", () => {
    it("moves focal point with arrow directions", () => {
      const nudged = nudgePosition(DEFAULT_HERO_TRANSFORM, "left");
      expect(nudged.positionX).toBeLessThan(DEFAULT_HERO_TRANSFORM.positionX);
    });

    it("uses larger steps with shift modifier", () => {
      const small = nudgePosition(DEFAULT_HERO_TRANSFORM, "right", false);
      const large = nudgePosition(DEFAULT_HERO_TRANSFORM, "right", true);
      expect(large.positionX - DEFAULT_HERO_TRANSFORM.positionX).toBeGreaterThan(
        small.positionX - DEFAULT_HERO_TRANSFORM.positionX,
      );
    });
  });

  describe("clampPosition", () => {
    it("clamps out-of-range values", () => {
      expect(
        clampPosition({ positionX: -1, positionY: 2, zoom: 0.2 }),
      ).toEqual({
        positionX: 0,
        positionY: 1,
        zoom: HERO_MIN_ZOOM,
      });
    });
  });
});
