/**
 * SidebarPlatformBrand — SCE-DESIGN-02 / SCE-DS2-05B-R1
 *
 * Integrated SportClubEvo platform identity at the sidebar footer and global
 * navigation brand rail. Wordmark variant follows `data-sce-theme` (White
 * Edition vs default dark chrome) without page-specific overrides.
 */

import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_ASPECT,
  SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC,
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_ASPECT,
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
} from "@/lib/branding/sportclubevo-platform-wordmark";

const LOGO_HEIGHT_PX = 32;

type SidebarPlatformBrandProps = {
  collapsed?: boolean;
  className?: string;
};

function wordmarkDimensions(collapsed: boolean, aspect: number) {
  const height = LOGO_HEIGHT_PX;
  return {
    height,
    width: collapsed ? height : Math.round(height * aspect),
  };
}

export default function SidebarPlatformBrand({
  collapsed = false,
  className,
}: SidebarPlatformBrandProps) {
  const onLight = wordmarkDimensions(collapsed, SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_ASPECT);
  const onDark = wordmarkDimensions(collapsed, SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_ASPECT);

  const imageClassName = cn(
    "object-contain opacity-85 transition-opacity duration-[120ms] hover:opacity-100",
    collapsed ? "h-8 w-8" : "h-8 w-auto max-w-[148px]",
  );

  return (
    <div
      className={cn(
        "sce-platform-brand-wordmark flex items-center justify-center px-3 py-2",
        collapsed && "px-1",
        className,
      )}
      role="img"
      aria-label="SportClubEvo"
    >
      <Image
        src={SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC}
        alt=""
        aria-hidden
        width={onLight.width}
        height={onLight.height}
        className={cn(
          "sce-platform-wordmark sce-platform-wordmark--on-light-surface",
          imageClassName,
        )}
        data-testid="sce-platform-wordmark-on-light"
      />
      <Image
        src={SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC}
        alt="SportClubEvo"
        width={onDark.width}
        height={onDark.height}
        className={cn(
          "sce-platform-wordmark sce-platform-wordmark--on-dark-surface",
          imageClassName,
        )}
        data-testid="sce-platform-wordmark-on-dark"
      />
    </div>
  );
}
