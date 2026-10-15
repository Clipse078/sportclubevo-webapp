"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { useTranslations } from "next-intl";
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

export function formatWideSeasonLabel(label: string, seasonWord = "Season"): string {
  const trimmed = label.trim();
  const seasonPrefix = new RegExp(`^${seasonWord}\\s+`, "i");
  if (seasonPrefix.test(trimmed)) {
    return trimmed;
  }
  if (/^Season\s+/i.test(trimmed)) {
    return trimmed.replace(/^Season\s+/i, `${seasonWord} `);
  }
  if (/^Saison\s+/i.test(trimmed)) {
    return trimmed.replace(/^Saison\s+/i, `${seasonWord} `);
  }
  const slashPair = trimmed.match(/^(\d{4})\/(\d{4})$/);
  if (slashPair) {
    return `${seasonWord} ${slashPair[1]}/${slashPair[2]}`;
  }
  return trimmed;
}

export function formatSeasonLabelForDisplay(
  label: string,
  mode: SceSeasonDisplayMode,
  seasonWord = "Season",
): string {
  if (mode === "icon") {
    return formatWideSeasonLabel(label, seasonWord);
  }
  if (mode === "medium") {
    return formatCompactSeasonLabel(label);
  }
  return formatWideSeasonLabel(label, seasonWord);
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
  const t = useTranslations("AppShell");
  const seasonWord = t("seasonLabel");
  const fullLabel = selectedSeasonKey ?? activeSeasonLabel ?? seasonWord;
  const displayLabel = formatSeasonLabelForDisplay(fullLabel, displayMode, seasonWord);
  const href = buildSeasonsHref(selectedSeasonKey, activeSeasonKey);
  const iconOnly = displayMode === "icon";
  const accessibleWide = formatWideSeasonLabel(fullLabel, seasonWord);

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
      aria-label={`${switchLabel}: ${accessibleWide}`}
      title={accessibleWide}
    >
      <CalendarRange className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <span className="sce-global-season-switcher-label">{displayLabel}</span>
    </Link>
  );
}
