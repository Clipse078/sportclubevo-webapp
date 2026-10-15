"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/cn";

export type SceSeasonDisplayMode = "wide" | "medium" | "icon";

export type SceGlobalSeasonSwitcherProps = {
  /** Persisted tenant-current season label (Season.isActive). */
  activeSeasonLabel?: string | null;
  activeSeasonKey?: string | null;
  /** Explicit ?season= override from the URL, when present. */
  selectedSeasonKey?: string | null;
  className?: string;
  switchLabel?: string;
  /** Responsive label variant — never arbitrary mid-word ellipsis. */
  displayMode?: SceSeasonDisplayMode;
};

export function formatCompactSeasonLabel(label: string): string {
  const trimmed = label.trim();
  const slashPair = trimmed.match(/^(?:Season\s+)?(\d{4})\/(\d{4})$/i);
  if (slashPair) {
    return `${slashPair[1]}/${slashPair[2]!.slice(-2)}`;
  }
  return trimmed.replace(/^Season\s+/i, "");
}

export function formatWideSeasonLabel(label: string): string {
  const trimmed = label.trim();
  if (/^Season\s+/i.test(trimmed)) {
    return trimmed;
  }
  const slashPair = trimmed.match(/^(\d{4})\/(\d{4})$/);
  if (slashPair) {
    return `Season ${slashPair[1]}/${slashPair[2]}`;
  }
  return trimmed;
}

export function formatSeasonLabelForDisplay(
  label: string,
  mode: SceSeasonDisplayMode,
): string {
  if (mode === "icon") {
    return formatWideSeasonLabel(label);
  }
  if (mode === "medium") {
    return formatCompactSeasonLabel(label);
  }
  return formatWideSeasonLabel(label);
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
  displayMode = "wide",
}: SceGlobalSeasonSwitcherProps) {
  const fullLabel = selectedSeasonKey ?? activeSeasonLabel ?? "Saison";
  const displayLabel = formatSeasonLabelForDisplay(fullLabel, displayMode);
  const href = buildSeasonsHref(selectedSeasonKey, activeSeasonKey);
  const iconOnly = displayMode === "icon";

  return (
    <Link
      href={href}
      className={cn(
        "sce-global-season-switcher",
        iconOnly && "sce-global-season-switcher--icon-only",
        className,
      )}
      data-testid="global-season-switcher"
      data-sce-season-display={displayMode}
      aria-label={`${switchLabel}: ${formatWideSeasonLabel(fullLabel)}`}
      title={formatWideSeasonLabel(fullLabel)}
    >
      <CalendarRange className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <span className="sce-global-season-switcher-label">{displayLabel}</span>
    </Link>
  );
}
