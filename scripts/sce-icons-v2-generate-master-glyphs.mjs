#!/usr/bin/env node
/**
 * Regenerate approved master React glyphs from authoritative V2 SVG artwork.
 * Does not modify public/images/icons/*.svg
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const BATCHES = {
  "approved-hero-glyphs.tsx": {
    propsType: "ApprovedHeroGlyphProps",
    icons: ["dashboard", "week-planner", "training", "match", "tournament"],
    extraImports: `import type { ComponentType } from "react";
import { SCE_APPROVED_EXPANDED_MASTER_GLYPHS } from "./approved-expanded-master-glyphs";
import { SCE_APPROVED_ANALYTICS_WORKFLOW_MASTER_GLYPHS } from "./approved-analytics-workflow-master-glyphs";
import { SCE_APPROVED_FINANCE_COMMERCIAL_MASTER_GLYPHS } from "./approved-finance-commercial-master-glyphs";
import { SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_GLYPHS } from "./approved-people-operations-master-glyphs";
import { SCE_APPROVED_PLATFORM_MASTER_GLYPHS } from "./approved-platform-master-glyphs";
import { SCE_APPROVED_FINAL_SEMANTIC_MASTER_GLYPHS } from "./approved-final-semantic-master-glyphs";`,
    exportConst: "SCE_APPROVED_HERO_GLYPHS",
    includeIsApproved: true,
  },
  "approved-expanded-master-glyphs.tsx": {
    propsType: "ApprovedMasterGlyphProps",
    icons: [
      "team",
      "season",
      "standings",
      "results",
      "attendance",
      "pitch",
      "dressing-room",
      "organisation",
      "org-unit",
      "people",
      "roles-access",
      "club",
      "documents",
      "tasks",
      "requirements",
      "events",
      "communication",
    ],
    exportConst: "SCE_APPROVED_EXPANDED_MASTER_GLYPHS",
  },
  "approved-platform-master-glyphs.tsx": {
    propsType: "ApprovedMasterGlyphProps",
    icons: [
      "attention",
      "audit",
      "billing-invoice",
      "conflict",
      "infoboard",
      "news",
      "notifications",
      "planning",
      "publish",
      "resource-allocation",
      "settings",
      "website",
    ],
    exportConst: "SCE_APPROVED_PLATFORM_MASTER_GLYPHS",
  },
  "approved-people-operations-master-glyphs.tsx": {
    propsType: "ApprovedMasterGlyphProps",
    icons: [
      "absence",
      "assignment",
      "availability",
      "check-in",
      "coach",
      "committee-board",
      "contact",
      "facility",
      "guardian-parent",
      "invitation",
      "member",
      "partner",
      "player",
      "sponsor",
      "team-management",
      "volunteer",
    ],
    exportConst: "SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_GLYPHS",
  },
  "approved-finance-commercial-master-glyphs.tsx": {
    propsType: "ApprovedMasterGlyphProps",
    icons: [
      "booking",
      "budget",
      "business-club",
      "commercial-account",
      "contract",
      "cost-centre",
      "expense",
      "facility-booking",
      "finance",
      "payment",
      "qr-invoice",
      "receipt",
      "revenue",
      "sponsorship-management",
      "subscription",
      "transaction",
    ],
    exportConst: "SCE_APPROVED_FINANCE_COMMERCIAL_MASTER_GLYPHS",
  },
  "approved-analytics-workflow-master-glyphs.tsx": {
    propsType: "ApprovedMasterGlyphProps",
    icons: [
      "analytics",
      "approval",
      "archive",
      "automation",
      "export",
      "form",
      "history",
      "import",
      "insight",
      "integration",
      "report",
      "workflow",
    ],
    exportConst: "SCE_APPROVED_ANALYTICS_WORKFLOW_MASTER_GLYPHS",
  },
  "approved-final-semantic-master-glyphs.tsx": {
    propsType: "ApprovedMasterGlyphProps",
    icons: [
      "competition",
      "page",
      "media-library",
      "block-library",
      "website-navigation",
      "homepage-builder",
      "goal",
      "initiative",
      "material-inventory",
      "discipline-incident",
      "target-group",
      "waiting-list",
    ],
    exportConst: "SCE_APPROVED_FINAL_SEMANTIC_MASTER_GLYPHS",
  },
};

function pascalCase(kebab) {
  return kebab
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function svgInnerToJsx(inner) {
  let jsx = inner.trim();
  jsx = jsx.replace(/stroke-width=/gi, "strokeWidth=");
  jsx = jsx.replace(/stroke-linecap=/gi, "strokeLinecap=");
  jsx = jsx.replace(/stroke-linejoin=/gi, "strokeLinejoin=");
  jsx = jsx.replace(/fill-rule=/gi, "fillRule=");
  jsx = jsx.replace(/clip-rule=/gi, "clipRule=");
  jsx = jsx.replace(/<(\w+)([^>]*?)><\/\1>/g, "<$1$2/>");
  return jsx;
}

function buildGlyphFunction(name, propsType) {
  const rel = `public/images/icons/${name}.svg`;
  const raw = readFileSync(join(ROOT, rel), "utf8");
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
  const jsxBody = svgInnerToJsx(inner);
  const fn = `${pascalCase(name)}ApprovedMasterGlyph`;
  return `/** Geometry copied exactly from \`${rel}\` (V2 monochrome artwork). */
export function ${fn}(props: ${propsType}) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      ${jsxBody}
    </SceIconSvg>
  );
}`;
}

function buildFile(filename, config) {
  const propsType = config.propsType;
  const typeAlias =
    propsType === "ApprovedHeroGlyphProps"
      ? "type ApprovedHeroGlyphProps = SceIconGlyphProps;"
      : "type ApprovedMasterGlyphProps = SceIconGlyphProps;";

  const functions = config.icons.map((name) => buildGlyphFunction(name, propsType));
  const exportNames = config.icons.map((n) => `${pascalCase(n)}ApprovedMasterGlyph`);

  let extra = "";
  if (config.extraImports) {
    extra = `\n${config.extraImports}\n`;
  }

  let tail = `export const ${config.exportConst} = [\n  ${exportNames.join(",\n  ")},\n] as const;\n`;

  if (config.includeIsApproved) {
    tail += `
export function isSceApprovedMasterGlyph(glyph: ComponentType<SceIconGlyphProps>): boolean {
  const all = [
    ...SCE_APPROVED_HERO_GLYPHS,
    ...SCE_APPROVED_EXPANDED_MASTER_GLYPHS,
    ...SCE_APPROVED_PLATFORM_MASTER_GLYPHS,
    ...SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_GLYPHS,
    ...SCE_APPROVED_FINANCE_COMMERCIAL_MASTER_GLYPHS,
    ...SCE_APPROVED_ANALYTICS_WORKFLOW_MASTER_GLYPHS,
    ...SCE_APPROVED_FINAL_SEMANTIC_MASTER_GLYPHS,
  ] as readonly ComponentType<SceIconGlyphProps>[];
  return all.includes(glyph);
}
`;
  }

  const file = `import {
  resolveSceIconPixelSize,
  type SceIconGlyphProps,
} from "../SceIcon.types";
import { SceIconSvg } from "../SceIconSvg";
import { SCE_APPROVED_HERO_VIEWBOX } from "./approved-hero-meta";
${extra}
${typeAlias}

function masterSvgProps({
  className,
  size = 24,
  title,
}: ${propsType}) {
  return {
    size: resolveSceIconPixelSize(size),
    viewBox: SCE_APPROVED_HERO_VIEWBOX,
    className,
    title,
  };
}

${functions.join("\n\n")}

${tail}`;

  const out = join(ROOT, "components/design-system/icons/masters", filename);
  writeFileSync(out, file);
  console.log("wrote", filename, config.icons.length, "glyphs");
}

for (const [filename, config] of Object.entries(BATCHES)) {
  buildFile(filename, config);
}

console.log("done");
