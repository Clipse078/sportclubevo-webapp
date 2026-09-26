#!/usr/bin/env node
/**
 * One-off generator: SVG inner markup → approved-final-semantic-master-glyphs.tsx
 * Preserves exact stroke/fill colors from authoritative artwork.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ICONS = [
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
];

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
  // Self-close empty elements
  jsx = jsx.replace(/<(\w+)([^>]*?)><\/\1>/g, "<$1$2/>");
  return jsx;
}

const functions = [];

for (const name of ICONS) {
  const rel = `public/images/icons/${name}.svg`;
  const raw = readFileSync(join(ROOT, rel), "utf8");
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
  const jsxBody = svgInnerToJsx(inner);
  const fn = `${pascalCase(name)}ApprovedMasterGlyph`;
  functions.push(`/** Geometry copied exactly from \`${rel}\`. */
export function ${fn}(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      ${jsxBody.includes("<g") ? jsxBody : `<g strokeLinecap="round" strokeLinejoin="round">${jsxBody}</g>`}
    </SceIconSvg>
  );
}`);
}

const file = `import {
  resolveSceIconPixelSize,
  type SceIconGlyphProps,
} from "../SceIcon.types";
import { SceIconSvg } from "../SceIconSvg";
import { SCE_APPROVED_HERO_VIEWBOX } from "./approved-hero-meta";

type ApprovedMasterGlyphProps = SceIconGlyphProps;

function masterSvgProps({
  className,
  size = 24,
  title,
}: ApprovedMasterGlyphProps) {
  return {
    size: resolveSceIconPixelSize(size),
    viewBox: SCE_APPROVED_HERO_VIEWBOX,
    className,
    title,
  };
}

${functions.join("\n\n")}

export const SCE_APPROVED_FINAL_SEMANTIC_MASTER_GLYPHS = [
${ICONS.map((n) => `  ${pascalCase(n)}ApprovedMasterGlyph,`).join("\n")}
] as const;
`;

writeFileSync(
  join(ROOT, "components/design-system/icons/masters/approved-final-semantic-master-glyphs.tsx"),
  file,
);
console.log("Wrote approved-final-semantic-master-glyphs.tsx");
