"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/cn";

export type SceGlobalSeasonSwitcherProps = {
  /** Persisted tenant-current season label (Season.isActive). */
  activeSeasonLabel?: string | null;
  activeSeasonKey?: string | null;
  /** Explicit ?season= override from the URL, when present. */
  selectedSeasonKey?: string | null;
  className?: string;
  switchLabel?: string;
  /** Shorter label (e.g. 2026/27) for constrained Row 1 widths. */
  compact?: boolean;
};

export function formatCompactSeasonLabel(label: string): string {
  const slashPair = label.match(/^(\d{4})\/(\d{4})$/);
  if (slashPair) {
    return `${slashPair[1]}/${slashPair[2]!.slice(-2)}`;
  }
  return label;
}

function buildSeasonsHref(selectedSeasonKey?: string | null, activeSeasonKey?: string | null) {
  const key = selectedSeasonKey ?? activeSeasonKey;
  if (!key) return "/dashboard/seasons";
  return `/dashboard/seasons?season=${encodeURIComponent(key)}`;
}

export function SceGlobalSeasonSwitcher({
  activeSeasonLabel,
  activeSeasonKey,
  selectedSeasonKey,
  className,
  switchLabel = "Saison wechseln",
  compact = false,
}: SceGlobalSeasonSwitcherProps) {
  const fullLabel = selectedSeasonKey ?? activeSeasonLabel ?? "Saison";
  const displayLabel = compact ? formatCompactSeasonLabel(fullLabel) : fullLabel;
  const href = buildSeasonsHref(selectedSeasonKey, activeSeasonKey);

  return (
    <Link
      href={href}
      className={cn(
        "sce-global-season-switcher",
        compact && "sce-global-season-switcher--compact",
        className,
      )}
      data-testid="global-season-switcher"
      aria-label={`${switchLabel}: ${fullLabel}`}
      title={fullLabel}
    >
      <CalendarRange className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <span
        className={cn(
          "sce-global-season-switcher-label truncate",
          compact ? "max-w-[4.5rem]" : "max-w-[7rem]",
        )}
      >
        {displayLabel}
      </span>
    </Link>
  );
}
