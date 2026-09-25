"use client";

import type { SceIconProps } from "./SceIcon.types";
import { SCE_ICON_REGISTRY, type SceIconRegistryName } from "./registry";

/**
 * SportClubEvo canonical icon component.
 *
 * Decorative by default (`aria-hidden`). Pass `title` for standalone accessible names.
 */
export function SceIcon({
  name,
  size = 24,
  className,
  title,
}: SceIconProps) {
  const entry = SCE_ICON_REGISTRY[name];
  if (!entry) {
    return (
      <span
        data-sce-icon-missing={name}
        className={className}
        aria-hidden="true"
      />
    );
  }

  const { Glyph } = entry;
  return <Glyph size={size} className={className} title={title} />;
}

export type { SceIconRegistryName as SceIconName };
