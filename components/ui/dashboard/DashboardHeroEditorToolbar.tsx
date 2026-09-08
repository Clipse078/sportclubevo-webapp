"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  HERO_MAX_ZOOM,
  HERO_MIN_ZOOM,
  type HeroImageTransform,
} from "@/lib/dashboard/dashboard-hero-position";

type DashboardHeroEditorToolbarProps = {
  transform: HeroImageTransform;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving?: boolean;
};

const ZOOM_STEP = 0.1;

export function DashboardHeroEditorToolbar({
  transform,
  onZoomChange,
  onReset,
  onCancel,
  onSave,
  isSaving = false,
}: DashboardHeroEditorToolbarProps) {
  const zoomPercent = Math.round(transform.zoom * 100);

  const decreaseZoom = () => {
    onZoomChange(Math.max(HERO_MIN_ZOOM, transform.zoom - ZOOM_STEP));
  };

  const increaseZoom = () => {
    onZoomChange(Math.min(HERO_MAX_ZOOM, transform.zoom + ZOOM_STEP));
  };

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 bottom-3 z-30 flex justify-center px-3",
      )}
      role="toolbar"
      aria-label="Titelbild anpassen"
    >
      <div
        className={cn(
          "flex w-full max-w-[40rem] flex-wrap items-center gap-2 rounded-[var(--radius-md)]",
          "border border-[color-mix(in_srgb,var(--border)_65%,transparent)]",
          "bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-3 py-2",
          "shadow-[var(--shadow-md)] backdrop-blur-md",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            onClick={decreaseZoom}
            disabled={transform.zoom <= HERO_MIN_ZOOM || isSaving}
            aria-label="Verkleinern"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
              "border border-[color-mix(in_srgb,var(--border)_55%,transparent)]",
              "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <input
            type="range"
            min={HERO_MIN_ZOOM}
            max={HERO_MAX_ZOOM}
            step={0.05}
            value={transform.zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            disabled={isSaving}
            aria-label="Zoom"
            aria-valuemin={HERO_MIN_ZOOM}
            aria-valuemax={HERO_MAX_ZOOM}
            aria-valuenow={transform.zoom}
            aria-valuetext={`${zoomPercent} Prozent`}
            className={cn(
              "h-1.5 min-w-[5rem] flex-1 cursor-pointer appearance-none rounded-full",
              "bg-[color-mix(in_srgb,var(--border)_70%,transparent)]",
              "accent-[var(--sce-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          />

          <button
            type="button"
            onClick={increaseZoom}
            disabled={transform.zoom >= HERO_MAX_ZOOM || isSaving}
            aria-label="Vergrößern"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
              "border border-[color-mix(in_srgb,var(--border)_55%,transparent)]",
              "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <span className="hidden text-[0.6875rem] tabular-nums text-[var(--text-2)] sm:inline">
            {zoomPercent}%
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onReset}
            disabled={isSaving}
            className={cn(
              "inline-flex min-h-[2rem] items-center rounded-[var(--radius-sm)] px-2.5",
              "text-[0.75rem] font-medium text-[var(--foreground)]",
              "hover:bg-[var(--surface-2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            Zurücksetzen
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className={cn(
              "inline-flex min-h-[2rem] items-center rounded-[var(--radius-sm)] px-2.5",
              "text-[0.75rem] font-medium text-[var(--foreground)]",
              "hover:bg-[var(--surface-2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "inline-flex min-h-[2rem] items-center rounded-[var(--radius-sm)] px-3",
              "bg-[var(--sce-primary)] text-[0.75rem] font-semibold text-[var(--sce-primary-foreground)]",
              "hover:brightness-110",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
              "disabled:cursor-wait disabled:opacity-70",
            )}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
