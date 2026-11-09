/**
 * PoweredByBadge — discreet SportClubEvo platform attribution (drawer / legacy sidebar).
 * Uses theme-aware wordmarks (SCE-DS2-05B-R1).
 */

import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_ASPECT,
  SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC,
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_ASPECT,
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
} from "@/lib/branding/sportclubevo-platform-wordmark";

const WORDMARK_HEIGHT_PX = 14;

type PoweredByBadgeProps = {
  collapsed?: boolean;
  className?: string;
};

export default function PoweredByBadge({
  collapsed = false,
  className,
}: PoweredByBadgeProps) {
  const onLightWidth = Math.round(WORDMARK_HEIGHT_PX * SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_ASPECT);
  const onDarkWidth = Math.round(WORDMARK_HEIGHT_PX * SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_ASPECT);

  return (
    <div
      className={cn(
        "sce-platform-attribution flex items-center justify-center gap-1.5 px-2 py-1 text-[0.625rem] font-medium text-[var(--text-2)]",
        className,
      )}
      title="Powered by SportClubEvo"
      data-testid="sce-powered-by-badge"
    >
      {!collapsed && <span className="whitespace-nowrap">Powered by</span>}
      <span className="relative inline-flex h-[14px] items-center">
        <Image
          src={SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC}
          alt=""
          aria-hidden
          width={onLightWidth}
          height={WORDMARK_HEIGHT_PX}
          className="sce-platform-wordmark sce-platform-wordmark--on-light-surface h-[14px] w-auto max-w-[5.5rem] object-contain opacity-90"
        />
        <Image
          src={SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC}
          alt="SportClubEvo"
          width={onDarkWidth}
          height={WORDMARK_HEIGHT_PX}
          className="sce-platform-wordmark sce-platform-wordmark--on-dark-surface h-[14px] w-auto max-w-[5.5rem] object-contain opacity-90"
        />
      </span>
    </div>
  );
}
