"use client";

import { LayoutGrid } from "lucide-react";
import { SceIcon } from "@/components/design-system/icons/SceIcon";
import type { SceIconSize } from "@/components/design-system/icons/SceIcon.types";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import { cn } from "@/lib/cn";

type NavDestinationSceIconProps = {
  navItemKey: string;
  size?: SceIconSize;
  active?: boolean;
  className?: string;
  /** When no approved SCE mapping exists, render the explorer generic module glyph. */
  fallbackGenericModuleGlyph?: boolean;
};

export function NavDestinationSceIcon({
  navItemKey,
  size = 20,
  active = false,
  className,
  fallbackGenericModuleGlyph = false,
}: NavDestinationSceIconProps) {
  const sceName = getNavDestinationSceIconName(navItemKey);
  if (sceName) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        aria-hidden
        data-sce-nav-destination-icon={sceName}
      >
        <SceIcon name={sceName} size={size} />
      </span>
    );
  }

  if (!fallbackGenericModuleGlyph) {
    return null;
  }

  const lucideSize =
    size === 16 ? "h-4 w-4" : size === 24 ? "h-6 w-6" : "h-5 w-5";

  return (
    <LayoutGrid
      className={cn(
        "shrink-0",
        lucideSize,
        active ? "text-[var(--sce-primary)]" : "text-[var(--muted)]",
        className,
      )}
      aria-hidden
      data-nav-destination-fallback="generic-module"
    />
  );
}
