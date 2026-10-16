"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import TrainingCreateForm from "@/components/admin/training/TrainingCreateForm";
import MatchCreateForm from "@/components/admin/matchcenter/MatchCreateForm";
import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import VeranstaltungCreateForm from "@/components/admin/veranstaltungen/VeranstaltungCreateForm";
import type { TrainingComposerCreateSurfaceProps } from "@/lib/training/composer/load-training-composer-create-surface-props.server";
import type { MatchComposerCreateSurfaceProps } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import type { TournamentComposerCreateSurfaceProps } from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";
import type { ClubEventComposerCreateSurfaceProps } from "@/lib/club-events/composer/load-club-event-composer-create-surface-props.server";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { SceActivityCreateOriginContext } from "@/lib/sce/activity-composer/origin-context";
import type { SceActivityCreatePermissions } from "@/lib/sce/activity-create/activity-create-permissions";
import {
  SCE_ACTIVITY_CREATE_MENU_ENTRIES,
  SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS,
} from "@/lib/sce/activity-create/activity-create-menu-config";
import { SceActivityCreateMenuItemIcon } from "./SceActivityCreateMenuItemIcon";

export type { SceActivityCreatePermissions };

export type SceActivityCreateMenuProps = {
  permissions: SceActivityCreatePermissions;
  trainingComposer?: TrainingComposerCreateSurfaceProps | null;
  matchComposer?: MatchComposerCreateSurfaceProps | null;
  tournamentComposer?: TournamentComposerCreateSurfaceProps | null;
  clubEventComposer?: ClubEventComposerCreateSurfaceProps | null;
  plannerUrlState?: PlanningHubUrlState;
  /** When true, post-success calls planning-hub revalidate (Wochenplaner / planning hub). */
  reconcilePlanningHub?: boolean;
  /** Primary header button (default), compact quick-access row item, or dashboard nav strip pill. */
  presentation?: "header" | "quick-access" | "dashboard-strip";
  /** Fixed origin when host surface is not a planning module (e.g. personal dashboard). */
  hostOriginContext?: SceActivityCreateOriginContext;
  className?: string;
};

export default function SceActivityCreateMenu({
  permissions,
  trainingComposer = null,
  matchComposer = null,
  tournamentComposer = null,
  clubEventComposer = null,
  plannerUrlState,
  reconcilePlanningHub = false,
  presentation = "header",
  hostOriginContext,
  className,
}: SceActivityCreateMenuProps) {
  const [open, setOpen] = useState(false);
  const [trainingOverlayOpen, setTrainingOverlayOpen] = useState(false);
  const [matchOverlayOpen, setMatchOverlayOpen] = useState(false);
  const [tournamentOverlayOpen, setTournamentOverlayOpen] = useState(false);
  const [clubEventOverlayOpen, setClubEventOverlayOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const trainingMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const matchMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const tournamentMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const clubEventMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowed = SCE_ACTIVITY_CREATE_MENU_ENTRIES.filter((entry) => permissions[entry.key]);

  const originContext = useMemo((): SceActivityCreateOriginContext | undefined => {
    if (
      !trainingOverlayOpen &&
      !matchOverlayOpen &&
      !tournamentOverlayOpen &&
      !clubEventOverlayOpen
    ) {
      return undefined;
    }
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    if (hostOriginContext) {
      return hostOriginContext;
    }
    return {
      kind: "PLANNING_SURFACE",
      pathname,
      searchParams: params,
      selectedWeek: plannerUrlState?.week,
    };
  }, [
    hostOriginContext,
    pathname,
    plannerUrlState?.week,
    searchParams,
    trainingOverlayOpen,
    matchOverlayOpen,
    tournamentOverlayOpen,
    clubEventOverlayOpen,
  ]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        menuTriggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const reconcileAfterSuccess = useCallback(async () => {
    if (!reconcilePlanningHub) return;
    try {
      await fetch("/api/planning-hub/planner-revalidate", { method: "POST" });
    } catch {
      /* router.refresh in composer still runs */
    }
  }, [reconcilePlanningHub]);

  const handleTrainingOverlayClose = useCallback(() => {
    setTrainingOverlayOpen(false);
    trainingMenuTriggerRef.current?.focus();
  }, []);

  const handleTrainingSuccess = useCallback(async () => {
    setTrainingOverlayOpen(false);
    menuTriggerRef.current?.focus();
    await reconcileAfterSuccess();
  }, [reconcileAfterSuccess]);

  const handleMatchOverlayClose = useCallback(() => {
    setMatchOverlayOpen(false);
    matchMenuTriggerRef.current?.focus();
  }, []);

  const handleMatchSuccess = useCallback(async () => {
    setMatchOverlayOpen(false);
    menuTriggerRef.current?.focus();
    await reconcileAfterSuccess();
  }, [reconcileAfterSuccess]);

  const handleTournamentOverlayClose = useCallback(() => {
    setTournamentOverlayOpen(false);
    tournamentMenuTriggerRef.current?.focus();
  }, []);

  const handleTournamentSuccess = useCallback(async () => {
    setTournamentOverlayOpen(false);
    menuTriggerRef.current?.focus();
    await reconcileAfterSuccess();
  }, [reconcileAfterSuccess]);

  const handleClubEventOverlayClose = useCallback(() => {
    setClubEventOverlayOpen(false);
    clubEventMenuTriggerRef.current?.focus();
  }, []);

  const handleClubEventSuccess = useCallback(async () => {
    setClubEventOverlayOpen(false);
    menuTriggerRef.current?.focus();
    await reconcileAfterSuccess();
  }, [reconcileAfterSuccess]);

  if (allowed.length === 0) return null;

  const trainingUsesOverlay = permissions.training && trainingComposer != null;
  const matchUsesOverlay = permissions.match && matchComposer != null;
  const tournamentUsesOverlay = permissions.tournament && tournamentComposer != null;
  const clubEventUsesOverlay = permissions.veranstaltung && clubEventComposer != null;

  const triggerClassName =
    presentation === "quick-access"
      ? "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
      : presentation === "dashboard-strip"
        ? cn(
            "inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-[var(--radius-md)] border px-2 py-1 text-[0.8125rem] font-medium",
            "border-[color-mix(in_srgb,var(--sce-primary)_40%,var(--border))] bg-[color-mix(in_srgb,var(--sce-primary)_6%,var(--surface))]",
            "text-[var(--foreground)] motion-safe:transition-[border-color,background-color]",
            "motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:bg-[var(--surface-2)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          )
        : "fca-button-primary inline-flex items-center gap-1.5 text-sm";

  return (
    <>
      <div className={cn("relative", className)} ref={rootRef}>
        <button
          type="button"
          ref={menuTriggerRef}
          onClick={() => setOpen((value) => !value)}
          className={triggerClassName}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Erstellen"
          data-testid="sce-activity-create"
        >
          <Plus
            className={cn(
              "h-3.5 w-3.5",
              (presentation === "quick-access" || presentation === "dashboard-strip") &&
                "text-[var(--sce-primary)]",
            )}
          />
          Erstellen
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition",
              open && "rotate-180",
              presentation === "quick-access" && "ml-auto opacity-70",
              presentation === "dashboard-strip" && "opacity-70",
            )}
          />
        </button>
        {open ? (
          <div
            role="menu"
            className={cn(
              "absolute z-20 mt-1 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg",
              presentation === "quick-access" || presentation === "dashboard-strip"
                ? "left-0"
                : "right-0",
            )}
            data-testid="sce-activity-create-menu"
          >
            {allowed.map((entry) => {
              const rowClass =
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]";
              if (entry.overlayKey === "training" && trainingUsesOverlay) {
                return (
                  <button
                    key={entry.key}
                    type="button"
                    role="menuitem"
                    ref={trainingMenuTriggerRef}
                    className={rowClass}
                    data-testid="sce-activity-create-training-overlay"
                    onClick={() => {
                      setOpen(false);
                      setTrainingOverlayOpen(true);
                    }}
                  >
                    <SceActivityCreateMenuItemIcon entry={entry} />
                    {entry.label}
                  </button>
                );
              }
              if (entry.overlayKey === "match" && matchUsesOverlay) {
                return (
                  <button
                    key={entry.key}
                    type="button"
                    role="menuitem"
                    ref={matchMenuTriggerRef}
                    className={rowClass}
                    data-testid="sce-activity-create-match-overlay"
                    onClick={() => {
                      setOpen(false);
                      setMatchOverlayOpen(true);
                    }}
                  >
                    <SceActivityCreateMenuItemIcon entry={entry} />
                    {entry.label}
                  </button>
                );
              }
              if (entry.overlayKey === "tournament" && tournamentUsesOverlay) {
                return (
                  <button
                    key={entry.key}
                    type="button"
                    role="menuitem"
                    ref={tournamentMenuTriggerRef}
                    className={rowClass}
                    data-testid="sce-activity-create-tournament-overlay"
                    onClick={() => {
                      setOpen(false);
                      setTournamentOverlayOpen(true);
                    }}
                  >
                    <SceActivityCreateMenuItemIcon entry={entry} />
                    {entry.label}
                  </button>
                );
              }
              if (entry.overlayKey === "veranstaltung" && clubEventUsesOverlay) {
                return (
                  <button
                    key={entry.key}
                    type="button"
                    role="menuitem"
                    ref={clubEventMenuTriggerRef}
                    className={rowClass}
                    data-testid="sce-activity-create-club-event-overlay"
                    onClick={() => {
                      setOpen(false);
                      setClubEventOverlayOpen(true);
                    }}
                  >
                    <SceActivityCreateMenuItemIcon entry={entry} />
                    {entry.label}
                  </button>
                );
              }
              return (
                <Link
                  key={entry.key}
                  href={entry.href}
                  role="menuitem"
                  className={rowClass}
                  data-testid={`sce-activity-create-link-${entry.key}`}
                  onClick={() => setOpen(false)}
                >
                  <SceActivityCreateMenuItemIcon entry={entry} />
                  {entry.label}
                </Link>
              );
            })}
          </div>
        ) : null}
        {trainingUsesOverlay ? (
          <Link
            href="/dashboard/training/new"
            className="sr-only"
            data-testid="sce-activity-create-training-page-fallback"
          >
            {SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS.training}
          </Link>
        ) : null}
        {matchUsesOverlay ? (
          <Link
            href="/dashboard/matchcenter/new"
            className="sr-only"
            data-testid="sce-activity-create-match-page-fallback"
          >
            {SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS.match}
          </Link>
        ) : null}
        {tournamentUsesOverlay ? (
          <Link
            href="/dashboard/tournamentcenter/new"
            className="sr-only"
            data-testid="sce-activity-create-tournament-page-fallback"
          >
            {SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS.tournament}
          </Link>
        ) : null}
        {clubEventUsesOverlay ? (
          <Link
            href="/dashboard/veranstaltungen/new"
            className="sr-only"
            data-testid="sce-activity-create-club-event-page-fallback"
          >
            {SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS.veranstaltung}
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
      {matchUsesOverlay && matchOverlayOpen && matchComposer ? (
        <MatchCreateForm
          activeSeasonId={matchComposer.activeSeasonId}
          teamOptions={matchComposer.teamOptions}
          pitchHallFacilityGroups={matchComposer.pitchHallFacilityGroups}
          dressingRoomFacilityGroups={matchComposer.dressingRoomFacilityGroups}
          tenantClubName={matchComposer.tenantClubName}
          tenantLogoUrl={matchComposer.tenantLogoUrl}
          effectiveGovernance={matchComposer.effectiveGovernance}
          containerMode="overlay"
          open={matchOverlayOpen}
          onClose={handleMatchOverlayClose}
          onSuccess={handleMatchSuccess}
          successBehavior="stay"
          originContext={originContext}
        />
      ) : null}
      {tournamentUsesOverlay && tournamentOverlayOpen && tournamentComposer ? (
        <TournamentCreateForm
          activeSeasonId={tournamentComposer.activeSeasonId}
          seasonOptions={tournamentComposer.seasonOptions}
          teamOptions={tournamentComposer.teamOptions}
          pitchHallFacilityGroups={tournamentComposer.pitchHallFacilityGroups}
          dressingRoomFacilityGroups={tournamentComposer.dressingRoomFacilityGroups}
          defaultTournamentDurationMinutes={tournamentComposer.defaultTournamentDurationMinutes}
          tenantClubName={tournamentComposer.tenantClubName}
          tenantLogoUrl={tournamentComposer.tenantLogoUrl}
          effectiveGovernance={tournamentComposer.effectiveGovernance}
          containerMode="overlay"
          open={tournamentOverlayOpen}
          onClose={handleTournamentOverlayClose}
          onSuccess={handleTournamentSuccess}
          successBehavior="stay"
          originContext={originContext}
        />
      ) : null}
      {clubEventUsesOverlay && clubEventOverlayOpen && clubEventComposer ? (
        <VeranstaltungCreateForm
          pitchHallFacilityGroups={clubEventComposer.pitchHallFacilityGroups}
          dressingRoomFacilityGroups={clubEventComposer.dressingRoomFacilityGroups}
          otherFacilityGroups={clubEventComposer.otherFacilityGroups}
          timeZone={clubEventComposer.timeZone}
          containerMode="overlay"
          effectiveGovernance={clubEventComposer.effectiveGovernance}
          open={clubEventOverlayOpen}
          onClose={handleClubEventOverlayClose}
          onSuccess={handleClubEventSuccess}
        />
      ) : null}
    </>
  );
}
