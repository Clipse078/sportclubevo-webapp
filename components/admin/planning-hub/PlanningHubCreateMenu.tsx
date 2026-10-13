"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import TrainingCreateForm from "@/components/admin/training/TrainingCreateForm";
import type { TrainingComposerCreateSurfaceProps } from "@/lib/training/composer/load-training-composer-create-surface-props.server";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { SceActivityCreateOriginContext } from "@/lib/sce/activity-composer/origin-context";

export type PlanningHubCreatePermissions = {
  training: boolean;
  match: boolean;
  tournament: boolean;
  veranstaltung: boolean;
};

type PlanningHubCreateMenuProps = {
  permissions: PlanningHubCreatePermissions;
  /** When set, Training opens as SceActivityComposer overlay instead of /dashboard/training/new. */
  trainingComposer?: TrainingComposerCreateSurfaceProps | null;
  plannerUrlState?: PlanningHubUrlState;
};

const NAV_CREATE_LINKS: Array<{
  key: Exclude<keyof PlanningHubCreatePermissions, never>;
  label: string;
  href: string;
  overlayKey?: "training";
}> = [
  { key: "training", label: "Training", href: "/dashboard/training/new", overlayKey: "training" },
  { key: "match", label: "Spiel", href: "/dashboard/matchcenter/new" },
  { key: "tournament", label: "Turnier", href: "/dashboard/tournamentcenter/new" },
  { key: "veranstaltung", label: "Veranstaltung", href: "/dashboard/veranstaltungen/new" },
];

export default function PlanningHubCreateMenu({
  permissions,
  trainingComposer = null,
  plannerUrlState,
}: PlanningHubCreateMenuProps) {
  const [open, setOpen] = useState(false);
  const [trainingOverlayOpen, setTrainingOverlayOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trainingMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowed = NAV_CREATE_LINKS.filter((entry) => permissions[entry.key]);

  const originContext = useMemo((): SceActivityCreateOriginContext | undefined => {
    if (!trainingOverlayOpen) return undefined;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return {
      kind: "PLANNING_SURFACE",
      pathname,
      searchParams: params,
      selectedWeek: plannerUrlState?.week,
    };
  }, [pathname, plannerUrlState?.week, searchParams, trainingOverlayOpen]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleTrainingOverlayClose = useCallback(() => {
    setTrainingOverlayOpen(false);
    trainingMenuTriggerRef.current?.focus();
  }, []);

  const handleTrainingSuccess = useCallback(async () => {
    setTrainingOverlayOpen(false);
    trainingMenuTriggerRef.current?.focus();
    try {
      await fetch("/api/planning-hub/planner-revalidate", { method: "POST" });
    } catch {
      /* refresh still runs via router.refresh in form */
    }
  }, []);

  if (allowed.length === 0) return null;

  const trainingUsesOverlay = permissions.training && trainingComposer != null;

  return (
    <>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
          data-testid="planning-hub-create"
        >
          <Plus className="h-3.5 w-3.5" />
          Erstellen
          <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
        {open && (
          <div
            className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
            data-testid="planning-hub-create-menu"
          >
            {allowed.map((entry) => {
              if (entry.overlayKey === "training" && trainingUsesOverlay) {
                return (
                  <button
                    key={entry.key}
                    type="button"
                    ref={trainingMenuTriggerRef}
                    className="block w-full px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    data-testid="planning-hub-create-training-overlay"
                    onClick={() => {
                      setOpen(false);
                      setTrainingOverlayOpen(true);
                    }}
                  >
                    {entry.label}
                  </button>
                );
              }
              return (
                <Link
                  key={entry.key}
                  href={entry.href}
                  className="block px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  data-testid={`planning-hub-create-link-${entry.key}`}
                  onClick={() => setOpen(false)}
                >
                  {entry.label}
                </Link>
              );
            })}
          </div>
        )}
        {trainingUsesOverlay ? (
          <Link
            href="/dashboard/training/new"
            className="sr-only"
            data-testid="planning-hub-create-training-page-fallback"
          >
            Training erstellen (Seite)
          </Link>
        ) : null}
      </div>
      {trainingUsesOverlay && trainingOverlayOpen && trainingComposer ? (
        <TrainingCreateForm
          teamSeasons={trainingComposer.teamSeasons}
          pitchHallFacilityGroups={trainingComposer.pitchHallFacilityGroups}
          dressingRoomFacilityGroups={trainingComposer.dressingRoomFacilityGroups}
          timeZone={trainingComposer.timeZone}
          defaultTrainingDurationMinutes={trainingComposer.defaultTrainingDurationMinutes}
          effectiveGovernance={trainingComposer.effectiveGovernance}
          containerMode="overlay"
          open={trainingOverlayOpen}
          onClose={handleTrainingOverlayClose}
          onSuccess={handleTrainingSuccess}
          successBehavior="stay"
          originContext={originContext}
        />
      ) : null}
    </>
  );
}
