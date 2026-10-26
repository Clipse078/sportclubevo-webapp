import { rgb, type RGB } from "pdf-lib";

/** Coherent SCE publication palette — structure only; tenant logo carries club identity. */
export const publicationPdfColors = {
  page: rgb(1, 1, 1),
  textPrimary: rgb(0.09, 0.11, 0.15),
  textSecondary: rgb(0.42, 0.45, 0.5),
  rule: rgb(0.82, 0.84, 0.87),
  ruleStrong: rgb(0.55, 0.58, 0.62),
  sectionAccent: rgb(0.07, 0.17, 0.29),
  /** Strongest non-white neutral on the page — anchors the report. */
  heroSurface: rgb(0.93, 0.95, 0.98),
  tableHeaderSurface: rgb(0.945, 0.955, 0.968),
  /** Deliberate table-level emphasis for Ergebnis. */
  resultSurface: rgb(0.91, 0.955, 0.99),
  favorableText: rgb(0.12, 0.42, 0.28),
  /** Driver cards — very pale, subordinate to hero. */
  favorableSurface: rgb(0.965, 0.99, 0.972),
  /** Hero variance band — pale green, clearly below forecast hierarchy. */
  favorableHeroBand: rgb(0.94, 0.98, 0.955),
  unfavorableText: rgb(0.55, 0.18, 0.16),
  unfavorableSurface: rgb(0.995, 0.975, 0.972),
  unfavorableHeroBand: rgb(0.98, 0.955, 0.952),
  managementAccent: rgb(0.14, 0.38, 0.32),
} as const;

export type PublicationPdfColorToken = keyof typeof publicationPdfColors;

function relativeLuminance(color: RGB): number {
  const channel = (c: number) => {
    const s = c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return s;
  };
  const r = channel(color.red);
  const g = channel(color.green);
  const b = channel(color.blue);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Semantic guards for publication surface hierarchy (used in FIN-06C-R5 tests). */
export function publicationPdfSurfaceHierarchyInvariants(): {
  heroStrongerThanDrivers: boolean;
  heroDistinctFromDriverSemantics: boolean;
  resultDistinctFromHero: boolean;
  tableHeaderDistinctFromHero: boolean;
  driverSemanticsDistinct: boolean;
} {
  const hero = publicationPdfColors.heroSurface;
  const favDriver = publicationPdfColors.favorableSurface;
  const unfavDriver = publicationPdfColors.unfavorableSurface;
  const result = publicationPdfColors.resultSurface;
  const header = publicationPdfColors.tableHeaderSurface;

  const heroL = relativeLuminance(hero);
  const favL = relativeLuminance(favDriver);
  const unfavL = relativeLuminance(unfavDriver);

  return {
    heroStrongerThanDrivers: heroL < favL && heroL < unfavL,
    heroDistinctFromDriverSemantics:
      hero.red !== favDriver.red &&
      hero.green !== favDriver.green &&
      hero.blue !== favDriver.blue,
    resultDistinctFromHero:
      result.red !== hero.red || result.green !== hero.green || result.blue !== hero.blue,
    tableHeaderDistinctFromHero:
      header.red !== hero.red || header.green !== hero.green || header.blue !== hero.blue,
    driverSemanticsDistinct:
      favDriver.red !== unfavDriver.red ||
      favDriver.green !== unfavDriver.green ||
      favDriver.blue !== unfavDriver.blue,
  };
}
