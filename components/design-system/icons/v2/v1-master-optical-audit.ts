/**
 * V1 approved master optical audit — SCE-ICONS-V2-01.
 *
 * Combines SVG/glyph heuristics with product-owner visual QA evidence.
 * Does not modify authoritative V1 artwork.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCE_ICON_REGISTRY } from "../registry";
import {
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
  type SceApprovedMasterIconName,
} from "../masters/approved-hero-meta";
import { SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS } from "../masters/approved-hero-fingerprint";

export type MasterComplexity = "LOW" | "MEDIUM" | "HIGH";
export type SilhouetteStrength = "STRONG" | "ACCEPTABLE" | "WEAK";
export type LegibilityRating = "PASS" | "REVIEW" | "FAIL";
export type MonochromeReadiness = "PASS" | "NEEDS_SIMPLIFICATION" | "NEEDS_REDRAW";
export type OpticalWeight = "LIGHT" | "BALANCED" | "HEAVY";
export type OpticalOccupancy = "SMALL" | "BALANCED" | "LARGE";
export type InternalDetail = "LOW" | "MEDIUM" | "HIGH";
export type Distinctiveness = "STRONG" | "ACCEPTABLE" | "WEAK";
export type MasterOpticalRecommendation =
  | "KEEP_GEOMETRY_MONOCHROME"
  | "SIMPLIFY"
  | "REDRAW"
  | "MICRO_VARIANT_CANDIDATE";

export type V1MasterOpticalAuditRecord = {
  name: SceApprovedMasterIconName;
  semantic: string;
  sourceFile: string;
  currentFingerprint: string;
  geometrySource: "approved-master";
  complexity: MasterComplexity;
  silhouetteStrength: SilhouetteStrength;
  legibility20Px: LegibilityRating;
  legibility24Px: LegibilityRating;
  monochromeReadiness: MonochromeReadiness;
  opticalWeight: OpticalWeight;
  opticalOccupancy: OpticalOccupancy;
  internalDetail: InternalDetail;
  distinctiveness: Distinctiveness;
  recommendation: MasterOpticalRecommendation;
  /** Product-owner or heuristic notes */
  auditNotes: string;
  priority: "P0" | "P1" | "P2" | "P3";
};

type PoOverride = Partial<
  Pick<
    V1MasterOpticalAuditRecord,
    | "silhouetteStrength"
    | "legibility20Px"
    | "legibility24Px"
    | "monochromeReadiness"
    | "recommendation"
    | "auditNotes"
    | "priority"
    | "complexity"
    | "internalDetail"
    | "opticalWeight"
    | "opticalOccupancy"
    | "distinctiveness"
  >
>;

/** Known product-owner QA visual evidence (SCE-ICONS-V2-01). */
const PO_VISUAL_OVERRIDES: Partial<Record<SceApprovedMasterIconName, PoOverride>> = {
  match: {
    silhouetteStrength: "STRONG",
    legibility20Px: "PASS",
    legibility24Px: "PASS",
    recommendation: "KEEP_GEOMETRY_MONOCHROME",
    auditNotes: "Open VS concept — strong silhouette, sport-neutral; retain concept in V2 monochrome.",
    priority: "P1",
    distinctiveness: "STRONG",
  },
  tournament: {
    silhouetteStrength: "STRONG",
    legibility20Px: "PASS",
    legibility24Px: "PASS",
    recommendation: "KEEP_GEOMETRY_MONOCHROME",
    auditNotes: "Trophy concept reads well; normalize stroke weight for monochrome/currentColor.",
    priority: "P1",
  },
  training: {
    silhouetteStrength: "WEAK",
    legibility20Px: "FAIL",
    legibility24Px: "REVIEW",
    complexity: "HIGH",
    internalDetail: "HIGH",
    monochromeReadiness: "NEEDS_REDRAW",
    recommendation: "SIMPLIFY",
    auditNotes: "Visually busy at small sizes; tactical illustration collapses — simplify strongly.",
    priority: "P0",
  },
  page: {
    silhouetteStrength: "WEAK",
    legibility20Px: "FAIL",
    legibility24Px: "FAIL",
    recommendation: "REDRAW",
    auditNotes: "Weak at real CMS UI size (20–24px).",
    priority: "P0",
  },
  "media-library": {
    silhouetteStrength: "WEAK",
    legibility20Px: "FAIL",
    legibility24Px: "REVIEW",
    recommendation: "REDRAW",
    auditNotes: "Weak at real CMS UI size.",
    priority: "P0",
  },
  "block-library": {
    silhouetteStrength: "WEAK",
    legibility20Px: "FAIL",
    legibility24Px: "REVIEW",
    recommendation: "REDRAW",
    auditNotes: "Weak at real CMS UI size.",
    priority: "P0",
  },
  "website-navigation": {
    silhouetteStrength: "WEAK",
    legibility20Px: "FAIL",
    legibility24Px: "REVIEW",
    recommendation: "REDRAW",
    auditNotes: "Weak at real CMS UI size.",
    priority: "P0",
  },
  "homepage-builder": {
    silhouetteStrength: "ACCEPTABLE",
    legibility20Px: "REVIEW",
    legibility24Px: "REVIEW",
    recommendation: "SIMPLIFY",
    auditNotes: "High element count; weak at CMS UI size — simplify layout blocks.",
    priority: "P0",
  },
};

const GLYPH_SOURCE = [
  "approved-hero-glyphs.tsx",
  "approved-expanded-master-glyphs.tsx",
  "approved-platform-master-glyphs.tsx",
  "approved-people-operations-master-glyphs.tsx",
  "approved-finance-commercial-master-glyphs.tsx",
  "approved-analytics-workflow-master-glyphs.tsx",
  "approved-final-semantic-master-glyphs.tsx",
]
  .map((file) =>
    readFileSync(join(process.cwd(), "components/design-system/icons/masters", file), "utf8"),
  )
  .join("\n");

function pascalFromKebab(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function countGlyphElements(name: SceApprovedMasterIconName): number {
  const fn = `${pascalFromKebab(name)}ApprovedMasterGlyph`;
  const re = new RegExp(`export function ${fn}[\\s\\S]*?(?=\\nexport function|$)`);
  const block = GLYPH_SOURCE.match(re)?.[0] ?? "";
  return (block.match(/<(path|rect|circle|line|ellipse|polyline|polygon)\b/gi) ?? []).length;
}

function countSvgElements(relativePath: string): number {
  const svg = readFileSync(join(process.cwd(), relativePath), "utf8");
  return (svg.match(/<(path|rect|circle|line|ellipse|polyline|polygon)\b/gi) ?? []).length;
}

function countColorRoles(name: SceApprovedMasterIconName): number {
  const fn = `${pascalFromKebab(name)}ApprovedMasterGlyph`;
  const re = new RegExp(`export function ${fn}[\\s\\S]*?(?=\\nexport function|$)`);
  const block = GLYPH_SOURCE.match(re)?.[0] ?? "";
  const roles = [
    (block.match(/var\(--sce-icon-primary\)/g) ?? []).length > 0,
    (block.match(/var\(--sce-icon-secondary\)/g) ?? []).length > 0,
    (block.match(/var\(--sce-icon-accent\)/g) ?? []).length > 0,
    (block.match(/var\(--sce-icon-muted\)/g) ?? []).length > 0,
  ].filter(Boolean).length;
  return roles;
}

function svgHasBakedBrandColors(relativePath: string): boolean {
  const svg = readFileSync(join(process.cwd(), relativePath), "utf8");
  return (
    /#[0-9A-Fa-f]{3,8}/.test(svg) ||
    /style="[^"]*--sce-icon-(primary|secondary|accent)/i.test(svg)
  );
}

function heuristicFromElements(elementCount: number): {
  complexity: MasterComplexity;
  internalDetail: InternalDetail;
  legibility20Px: LegibilityRating;
  legibility24Px: LegibilityRating;
  silhouetteStrength: SilhouetteStrength;
  opticalWeight: OpticalWeight;
  opticalOccupancy: OpticalOccupancy;
  distinctiveness: Distinctiveness;
} {
  const complexity: MasterComplexity =
    elementCount <= 3 ? "LOW" : elementCount <= 5 ? "MEDIUM" : "HIGH";
  const internalDetail: InternalDetail = complexity;
  const legibility20Px: LegibilityRating =
    elementCount <= 4 ? "PASS" : elementCount <= 6 ? "REVIEW" : "FAIL";
  const legibility24Px: LegibilityRating =
    elementCount <= 5 ? "PASS" : elementCount <= 7 ? "REVIEW" : "FAIL";
  const silhouetteStrength: SilhouetteStrength =
    elementCount <= 4 ? "STRONG" : elementCount <= 5 ? "ACCEPTABLE" : "WEAK";
  const opticalWeight: OpticalWeight =
    elementCount <= 3 ? "LIGHT" : elementCount >= 6 ? "HEAVY" : "BALANCED";
  const opticalOccupancy: OpticalOccupancy =
    elementCount <= 3 ? "SMALL" : elementCount >= 6 ? "LARGE" : "BALANCED";
  const distinctiveness: Distinctiveness =
    silhouetteStrength === "STRONG"
      ? "STRONG"
      : silhouetteStrength === "WEAK"
        ? "WEAK"
        : "ACCEPTABLE";

  return {
    complexity,
    internalDetail,
    legibility20Px,
    legibility24Px,
    silhouetteStrength,
    opticalWeight,
    opticalOccupancy,
    distinctiveness,
  };
}

function deriveRecommendation(input: {
  silhouetteStrength: SilhouetteStrength;
  legibility20Px: LegibilityRating;
  legibility24Px: LegibilityRating;
  elementCount: number;
  monochromeReadiness: MonochromeReadiness;
}): MasterOpticalRecommendation {
  if (input.legibility20Px === "FAIL" || input.monochromeReadiness === "NEEDS_REDRAW") {
    return input.elementCount >= 6 || input.legibility24Px === "FAIL" ? "REDRAW" : "SIMPLIFY";
  }
  if (
    input.silhouetteStrength === "STRONG" &&
    input.legibility20Px === "PASS" &&
    input.legibility24Px === "PASS"
  ) {
    return "KEEP_GEOMETRY_MONOCHROME";
  }
  if (input.elementCount >= 6 || input.legibility20Px === "REVIEW") {
    return "SIMPLIFY";
  }
  return "KEEP_GEOMETRY_MONOCHROME";
}

function derivePriority(
  recommendation: MasterOpticalRecommendation,
  legibility20Px: LegibilityRating,
): "P0" | "P1" | "P2" | "P3" {
  if (legibility20Px === "FAIL" || recommendation === "REDRAW") return "P0";
  if (recommendation === "SIMPLIFY") return "P1";
  if (recommendation === "KEEP_GEOMETRY_MONOCHROME") return "P2";
  return "P3";
}

export function buildV1MasterOpticalAudit(): V1MasterOpticalAuditRecord[] {
  return SCE_APPROVED_MASTER_ICON_NAMES.map((name) => {
    const asset = SCE_APPROVED_MASTER_ASSETS[name];
    const elementCount = Math.max(countSvgElements(asset), countGlyphElements(name));
    const colorRoles = countColorRoles(name);
    const baked = svgHasBakedBrandColors(asset);
    const heuristics = heuristicFromElements(elementCount);
    const po = PO_VISUAL_OVERRIDES[name];

    let monochromeReadiness: MonochromeReadiness = "NEEDS_SIMPLIFICATION";
    if (baked || colorRoles >= 2) {
      monochromeReadiness =
        heuristics.legibility20Px === "FAIL" || elementCount >= 7
          ? "NEEDS_REDRAW"
          : "NEEDS_SIMPLIFICATION";
    }

    const merged = {
      ...heuristics,
      ...po,
    };

    const recommendation =
      po?.recommendation ??
      deriveRecommendation({
        silhouetteStrength: merged.silhouetteStrength,
        legibility20Px: merged.legibility20Px,
        legibility24Px: merged.legibility24Px,
        elementCount,
        monochromeReadiness: po?.monochromeReadiness ?? monochromeReadiness,
      });

    return {
      name,
      semantic: SCE_ICON_REGISTRY[name].purpose,
      sourceFile: asset,
      currentFingerprint: SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS[name],
      geometrySource: "approved-master",
      complexity: merged.complexity ?? heuristics.complexity,
      silhouetteStrength: merged.silhouetteStrength ?? heuristics.silhouetteStrength,
      legibility20Px: merged.legibility20Px ?? heuristics.legibility20Px,
      legibility24Px: merged.legibility24Px ?? heuristics.legibility24Px,
      monochromeReadiness: po?.monochromeReadiness ?? monochromeReadiness,
      opticalWeight: merged.opticalWeight ?? heuristics.opticalWeight,
      opticalOccupancy: merged.opticalOccupancy ?? heuristics.opticalOccupancy,
      internalDetail: merged.internalDetail ?? heuristics.internalDetail,
      distinctiveness: merged.distinctiveness ?? heuristics.distinctiveness,
      recommendation,
      auditNotes:
        po?.auditNotes ??
        (baked
          ? "V1 master uses baked brand/token strokes — V2 must migrate to currentColor monochrome."
          : "Heuristic optical audit — validate on specimen at 20–24px."),
      priority:
        po?.priority ?? derivePriority(recommendation, merged.legibility20Px ?? heuristics.legibility20Px),
    };
  });
}

export function summarizeV1MasterOpticalAudit(records = buildV1MasterOpticalAudit()) {
  const count = <T extends string>(field: keyof V1MasterOpticalAuditRecord, value: T) =>
    records.filter((r) => r[field] === value).length;

  return {
    total: records.length,
    keepGeometryMonochrome: count("recommendation", "KEEP_GEOMETRY_MONOCHROME"),
    simplify: count("recommendation", "SIMPLIFY"),
    redraw: count("recommendation", "REDRAW"),
    microVariantCandidates: count("recommendation", "MICRO_VARIANT_CANDIDATE"),
    legibility20PxPass: count("legibility20Px", "PASS"),
    legibility20PxReview: count("legibility20Px", "REVIEW"),
    legibility20PxFail: count("legibility20Px", "FAIL"),
    legibility24PxPass: count("legibility24Px", "PASS"),
    legibility24PxReview: count("legibility24Px", "REVIEW"),
    legibility24PxFail: count("legibility24Px", "FAIL"),
    weakOrReview: records.filter(
      (r) => r.legibility20Px !== "PASS" || r.legibility24Px !== "PASS",
    ),
    strongMasters: records.filter(
      (r) =>
        r.recommendation === "KEEP_GEOMETRY_MONOCHROME" &&
        r.silhouetteStrength === "STRONG" &&
        r.legibility20Px === "PASS",
    ),
  };
}
