import type { ComponentType } from "react";

export const SCE_ICON_VIEWBOX = "0 0 24 24" as const;

export const SCE_ICON_SIZES = {
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  48: 48,
} as const;

export type SceIconSize = keyof typeof SCE_ICON_SIZES;

export function resolveSceIconPixelSize(size: SceIconSize | number | undefined): number {
  if (size === undefined) {
    return SCE_ICON_SIZES[24];
  }
  if (typeof size === "number") {
    return size;
  }
  return SCE_ICON_SIZES[size];
}

export const SCE_ICON_CATEGORIES = [
  "planning",
  "organisation",
  "communication",
  "club",
  "actions",
  "system",
] as const;

export type SceIconCategory = (typeof SCE_ICON_CATEGORIES)[number];

export const SCE_ICON_SEMANTIC_TYPES = [
  "DOMAIN",
  "ACTION",
  "STATUS",
  "STRUCTURAL",
] as const;

export type SceIconSemanticType = (typeof SCE_ICON_SEMANTIC_TYPES)[number];

export const SCE_ICON_STATUSES = ["experimental", "stable", "deprecated"] as const;

export type SceIconStatus = (typeof SCE_ICON_STATUSES)[number];

export type SceIconGlyphProps = {
  /** Render size in CSS pixels (16, 20, 24, 32, 48, or any positive number). */
  size?: SceIconSize | number;
  className?: string;
  title?: string;
};

export type SceIconGeometrySource = "approved-master" | "provisional-glyph";

export type SceIconRegistryEntry = {
  name: string;
  category: SceIconCategory;
  label: string;
  i18nKey?: string;
  purpose: string;
  aliases: readonly string[];
  semanticType: SceIconSemanticType;
  status: SceIconStatus;
  Glyph: ComponentType<SceIconGlyphProps>;
  /** Canonical design-master viewBox (defaults to 24×24 when omitted). */
  viewBox?: string;
  /** On-disk approved master artifact, when applicable. */
  masterAssetPath?: string;
  geometrySource?: SceIconGeometrySource;
};

export type SceIconProps = {
  name: import("./registry").SceIconRegistryName;
  size?: SceIconSize | number;
  className?: string;
  /** When set, icon is exposed to assistive tech with this title. Otherwise decorative (aria-hidden). */
  title?: string;
};
