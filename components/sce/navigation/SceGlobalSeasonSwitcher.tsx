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
};

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
}: SceGlobalSeasonSwitcherProps) {
  const displayLabel = selectedSeasonKey ?? activeSeasonLabel ?? "Saison";
  const href = buildSeasonsHref(selectedSeasonKey, activeSeasonKey);

  return (
    <Link
      href={href}
      className={cn("sce-global-season-switcher", className)}
      data-testid="global-season-switcher"
      aria-label={`${switchLabel}: ${displayLabel}`}
      title={switchLabel}
    >
      <CalendarRange className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <span className="sce-global-season-switcher-label max-w-[7rem] truncate">{displayLabel}</span>
    </Link>
  );
}
