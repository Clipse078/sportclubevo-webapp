"use client";

import { SceGlobalSeasonSwitcher } from "@/components/sce/navigation/SceGlobalSeasonSwitcher";
import { cn } from "@/lib/cn";

type SceRow2SeasonContextProps = {
  platformWorkspace: boolean;
  activeSeasonLabel?: string | null;
  activeSeasonKey?: string | null;
  selectedSeasonKey?: string | null;
  seasonSwitchLabel?: string;
  className?: string;
};

/**
 * Desktop Row 2 right anchor — season context aligned under Row 1 global utilities.
 */
export function SceRow2SeasonContext({
  platformWorkspace,
  activeSeasonLabel,
  activeSeasonKey,
  selectedSeasonKey,
  seasonSwitchLabel,
  className,
}: SceRow2SeasonContextProps) {
  if (platformWorkspace) return null;

  const seasonProps = {
    activeSeasonLabel,
    activeSeasonKey,
    selectedSeasonKey,
    switchLabel: seasonSwitchLabel,
  };

  return (
    <div
      className={cn("sce-row2-season-context hidden md:flex items-center", className)}
      data-testid="sce-row2-season-context"
    >
      <div className="hidden lg:flex">
        <SceGlobalSeasonSwitcher {...seasonProps} displayMode="wide" />
      </div>
      <div className="hidden md:flex lg:hidden">
        <SceGlobalSeasonSwitcher {...seasonProps} displayMode="medium" />
      </div>
    </div>
  );
}
