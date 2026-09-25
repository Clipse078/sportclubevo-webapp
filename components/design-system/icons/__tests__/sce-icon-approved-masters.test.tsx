/**
 * @vitest-environment jsdom
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceIcon } from "../SceIcon";
import type { SceIconSize } from "../SceIcon.types";
import { isSceApprovedMasterGlyph } from "../masters/approved-hero-glyphs";
import {
  fingerprintApprovedHeroMasterSvg,
  SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS,
  SCE_APPROVED_MASTER_BASELINE_FINGERPRINTS,
} from "../masters/approved-hero-fingerprint";
import {
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
  SCE_APPROVED_HERO_VIEWBOX,
} from "../masters/approved-hero-meta";
import { SCE_ICON_REGISTRY } from "../registry";

const HERO_SIZES: SceIconSize[] = [16, 20, 24, 32, 48];

function normalizeGeometryMarkup(fragment: string): string {
  let normalized = fragment
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/var\((--sce-icon-[a-z-]+),\s*[^)]+\)/gi, "var($1)")
    .replace(/stroke-width=/gi, "strokeWidth=")
    .replace(/stroke-linecap=/gi, "strokeLinecap=")
    .replace(/stroke-linejoin=/gi, "strokeLinejoin=")
    .replace(/<(\w+)([^>]*?)><\/\1>/g, "<$1$2/>")
    .replace(/<path d="([^"]+)"/gi, (_, d: string) => {
      const pathData = d.replace(/\s+/g, " ").trim();
      return `<path d="${pathData}"`;
    })
    .replace(/\s+/g, " ")
    .trim();
  normalized = normalized.replace(
    /^<g strokeLinecap="round" strokeLinejoin="round">(.*)<\/g>$/i,
    "$1",
  );
  return normalized.trim();
}

function serializeRenderedGeometry(container: HTMLElement): string {
  const svg = container.querySelector("svg");
  expect(svg).toBeTruthy();
  const clone = svg!.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("title").forEach((node) => node.remove());
  return normalizeGeometryMarkup(clone.innerHTML);
}

function serializeMasterFileGeometry(relativePath: string): string {
  const raw = readFileSync(join(process.cwd(), relativePath), "utf8");
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
  return normalizeGeometryMarkup(inner);
}

describe("SCE approved master library", () => {
  it("has committed master SVG artifacts on disk", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      const path = SCE_APPROVED_MASTER_ASSETS[name];
      expect(existsSync(join(process.cwd(), path))).toBe(true);
      const src = readFileSync(join(process.cwd(), path), "utf8");
      expect(src).toMatch(/viewBox="0 0 64 64"/);
      expect(src).not.toMatch(/<script/i);
      expect(src).not.toMatch(/<image|xlink:href|href="http/i);
      expect(src).not.toMatch(/<foreignObject/i);
      expect(src).not.toMatch(/<text[\s>]/i);
      expect(src).not.toMatch(/font-family/i);
    }
  });

  it("maps registry entries to approved master sources", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      const entry = SCE_ICON_REGISTRY[name];
      expect(entry.geometrySource).toBe("approved-master");
      expect(entry.masterAssetPath).toBe(SCE_APPROVED_MASTER_ASSETS[name]);
      expect(entry.viewBox).toBe(SCE_APPROVED_HERO_VIEWBOX);
      expect(isSceApprovedMasterGlyph(entry.Glyph)).toBe(true);
    }
  });

  it("preserves master viewBox at runtime (not provisional 24×24)", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      const { container } = render(<SceIcon name={name} size={24} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", SCE_APPROVED_HERO_VIEWBOX);
      expect(svg).not.toHaveAttribute("viewBox", "0 0 24 24");
    }
  });

  it("matches committed master geometry (fingerprint + DOM parity)", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      const asset = SCE_APPROVED_MASTER_ASSETS[name];
      expect(fingerprintApprovedHeroMasterSvg(asset)).toBe(
        SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS[name],
      );

      const { container } = render(<SceIcon name={name} size={48} />);
      const rendered = serializeRenderedGeometry(container);
      const fromFile = serializeMasterFileGeometry(asset);
      expect(rendered).toBe(fromFile);
    }
  });

  it("uses same geometry for Original and Light (token-only theming)", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      const original = render(<SceIcon name={name} size={32} />);
      const light = render(
        <div className="sce-theme-light">
          <SceIcon name={name} size={32} />
        </div>,
      );
      expect(serializeRenderedGeometry(original.container)).toBe(
        serializeRenderedGeometry(light.container),
      );
    }
  });

  it("renders hero specimen sizes without rasterization or remote assets", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      for (const size of HERO_SIZES) {
        const { container } = render(<SceIcon name={name} size={size} />);
        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("width", String(size));
        expect(svg).toHaveAttribute("height", String(size));
        expect(container.querySelector("img")).toBeNull();
        expect(container.innerHTML).not.toMatch(/(?:src|href|xlink:href)=["']https?:\/\//i);
      }
    }
  });

  it("preserves accessibility behavior", () => {
    const { container } = render(<SceIcon name="dashboard" title="Dashboard" />);
    expect(container.querySelector("svg")).not.toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("title")?.textContent).toBe("Dashboard");
  });

  it("has no duplicate light master SVG files", () => {
    const iconDir = join(process.cwd(), "public/images/icons");
    const files = readdirSync(iconDir);
    expect(files.some((f) => /-light\.svg$/i.test(f))).toBe(false);
  });

  it("preserves approved master geometry baselines (SCE-ICONS-04R1 authoritative artwork)", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS[name]).toBe(
        SCE_APPROVED_MASTER_BASELINE_FINGERPRINTS[name],
      );
    }
  });

  it("uses Open VS match master without football-specific markup", () => {
    const matchSrc = readFileSync(
      join(process.cwd(), SCE_APPROVED_MASTER_ASSETS.match),
      "utf8",
    );
    expect(matchSrc).not.toMatch(/<text[\s>]/i);
    expect(matchSrc).not.toMatch(/font-family/i);
    expect(matchSrc).not.toMatch(/M25 24l7-5 7 5/);
    expect(matchSrc).toMatch(/M18 13A23 23 0 0 0 11 32/);
    expect(matchSrc).toMatch(/M25 9a23 23 0 0 1 14 0/);
    expect(SCE_ICON_REGISTRY.match.name).toBe("match");
    const { container } = render(<SceIcon name="match" size={24} />);
    expect(container.innerHTML).toContain("M18 13A23 23 0 0 0 11 32");
    expect(container.innerHTML).not.toContain("M26 26l4 12 4-12");
    expect(container.innerHTML).not.toMatch(/<text[\s>]/i);
  });

  it("does not keep provisional hero glyphs in planning sources", () => {
    const planning = readFileSync(
      join(process.cwd(), "components/design-system/icons/glyphs/planning/index.tsx"),
      "utf8",
    );
    for (const symbol of [
      "DashboardGlyph",
      "WeekPlannerGlyph",
      "TrainingGlyph",
      "MatchGlyph",
      "TournamentGlyph",
    ]) {
      expect(planning).not.toContain(symbol);
    }
  });
});
