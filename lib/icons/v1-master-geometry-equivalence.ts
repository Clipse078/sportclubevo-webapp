/**
 * SCE-ICONS-V2-03 — deterministic V1 geometry equivalence (color/style stripped).
 */

/** Strip color ownership while preserving vector geometry markup. */
export function normalizeMasterSvgGeometryMarkup(svg: string): string {
  let normalized = svg.trim();
  normalized = normalized.replace(/\sstyle="[^"]*"/gi, "");
  normalized = normalized.replace(/\saria-hidden="[^"]*"/gi, "");
  normalized = normalized.replace(/\sxmlns="[^"]*"/gi, "");
  normalized = normalized.replace(/\sstroke="([^"]*)"/gi, (_match, value: string) => {
    if (value === "none") {
      return ' stroke="none"';
    }
    return ' stroke="__COLOR__"';
  });
  normalized = normalized.replace(/\sfill="([^"]*)"/gi, (_match, value: string) => {
    if (value === "none") {
      return ' fill="none"';
    }
    return ' fill="__COLOR__"';
  });
  normalized = normalized.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
  const viewBox = normalized.match(/viewBox="([^"]*)"/i)?.[1] ?? "MISSING_VIEWBOX";
  const inner = normalized
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
  return `${viewBox}::${inner}`;
}

export function masterSvgGeometryEquivalent(v1Svg: string, v2MonochromeSvg: string): boolean {
  return (
    normalizeMasterSvgGeometryMarkup(v1Svg) === normalizeMasterSvgGeometryMarkup(v2MonochromeSvg)
  );
}
