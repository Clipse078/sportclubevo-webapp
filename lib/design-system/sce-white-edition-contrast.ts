/**
 * DS 2.0 White Edition — documented text/surface pairs for automated contrast guardrails.
 * Values mirror app/globals.css `[data-sce-theme="white"]` (see sce-ds2-01-white-edition.test.ts).
 */

export type SceWhiteEditionContrastPair = {
  id: string;
  foreground: string;
  background: string;
  /** WCAG 2.x contrast ratio minimum (AA body text = 4.5, large text = 3). */
  minimumRatio: number;
};

export const SCE_WHITE_EDITION_CONTRAST_PAIRS: SceWhiteEditionContrastPair[] = [
  {
    id: "primary-on-canvas",
    foreground: "#0f172a",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
  {
    id: "secondary-on-canvas",
    foreground: "#475569",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
  {
    id: "muted-on-canvas",
    foreground: "#64748b",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
  {
    id: "primary-on-section-wash",
    foreground: "#0f172a",
    background: "#f8fafc",
    minimumRatio: 4.5,
  },
  {
    id: "secondary-on-panel",
    foreground: "#475569",
    background: "#f8fafc",
    minimumRatio: 4.5,
  },
  {
    id: "tenant-primary-on-canvas",
    foreground: "#0b4aa2",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
];

function hexChannel(value: string): number {
  const parsed = Number.parseInt(value, 16);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid hex channel: ${value}`);
  }
  return parsed / 255;
}

function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Expected #RRGGBB hex color, got: ${hex}`);
  }
  return {
    r: linearize(hexChannel(normalized.slice(0, 2))),
    g: linearize(hexChannel(normalized.slice(2, 4))),
    b: linearize(hexChannel(normalized.slice(4, 6))),
  };
}

export function relativeLuminanceFromHex(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = relativeLuminanceFromHex(foregroundHex);
  const l2 = relativeLuminanceFromHex(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function sceWhiteEditionContrastMatrixPass(): {
  pass: boolean;
  failures: Array<{ id: string; ratio: number; minimumRatio: number }>;
} {
  const failures: Array<{ id: string; ratio: number; minimumRatio: number }> = [];
  for (const pair of SCE_WHITE_EDITION_CONTRAST_PAIRS) {
    const ratio = contrastRatio(pair.foreground, pair.background);
    if (ratio < pair.minimumRatio) {
      failures.push({ id: pair.id, ratio, minimumRatio: pair.minimumRatio });
    }
  }
  return { pass: failures.length === 0, failures };
}
