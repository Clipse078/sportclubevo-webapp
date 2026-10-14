"use client";

import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  listOperationalRowStatus,
  listOperationalStatusLabel,
  type ListOperationalRowStatus,
} from "@/lib/planning-hub/list-operational";
import {
  PLANNING_HUB_LISTE_LOCATION_CELL_CLASS,
  PLANNING_HUB_LISTE_LOCATION_ICON_SLOT_CLASS,
  PLANNING_HUB_LISTE_ROW_COLUMN_CLASS,
  PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS,
  PLANNING_HUB_LISTE_ROW_GRID_CLASS,
} from "@/lib/planning-hub/planning-hub-liste-grid";
import {
  planningHubListeLocationLine,
  resolvePlanningHubListePresentationModel,
} from "@/lib/planning-hub/planning-hub-liste-presentation";
import { resolveSceTrainingPresentationFromWeekplannerTraining } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-training";
import { resolveSceMatchPresentationFromWeekplannerMatch } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-match";
import { resolveSceTournamentPresentationFromWeekplannerTournament } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-tournament";
import { resolveSceClubEventPresentationFromWeekplannerVeranstaltung } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-veranstaltung";
import { weekplannerAccessibleName, weekplannerTimeColumnLabel, weekplannerTimingDetail } from "@/lib/planning-hub/item-presenters";
import { activityVisualStyle } from "@/lib/planning-hub/activity-visual-style";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import PlanningHubListeRowMenu from "./PlanningHubListeRowMenu";
import WeekplannerListeOverrideIndicator from "./WeekplannerListeOverrideIndicator";

const LISTE_ROW_GRID = cn(
  "group relative rounded-lg border border-[var(--border)]/80 bg-[var(--surface)] p-2 shadow-sm transition",
  "hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40",
  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--sce-primary)] has-[:focus-visible]:ring-offset-0",
  PLANNING_HUB_LISTE_ROW_GRID_CLASS,
);

function statusBadgeClass(status: ListOperationalRowStatus): string {
  switch (status) {
    case "conflict":
      return "border-amber-300/80 bg-amber-500/12 text-amber-200";
    case "incomplete":
      return "border-sky-300/70 bg-sky-500/10 text-sky-200";
    case "open":
      return "border-violet-300/70 bg-violet-500/10 text-violet-200";
    case "ready":
    default:
      return "border-emerald-300/70 bg-emerald-500/10 text-emerald-200";
  }
}

type PlanningHubListeActivityRowProps = {
  item: WeekplannerItem;
  dayKey: string;
  locale: string;
  timezone: string;
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
  activeAlternativePlanName?: string | null;
  onItemOpen: (item: WeekplannerItem) => void;
  onItemEditPlanning: (item: WeekplannerItem) => void;
  onReviewConflictForItem: (item: WeekplannerItem) => void;
  canEditItem: boolean;
  permissionContext: Pick<
    ManipulationPermissionContext,
    | "canManageTrainings"
    | "canManageEvents"
    | "canManageAllocations"
    | "isStandardplan"
    | "alternativePlanId"
  > & {
    canViewTrainings?: boolean;
    canViewEvents?: boolean;
  };
};

function formatListeRowTime(
  item: WeekplannerItem,
  dayKey: string,
  locale: string,
  timezone: string,
): string {
  if (item.type === "VERANSTALTUNG" && item.allDay) {
    return weekplannerTimeColumnLabel(item, locale, timezone, dayKey);
  }
  return weekplannerTimingDetail(item, locale, timezone);
}

function SceListeActivityCard({
  item,
  locale,
  timezone,
  tenantClubName,
  tenantLogoUrl,
}: {
  item: WeekplannerItem;
  locale: string;
  timezone: string;
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
}) {
  const fmtCfg = { locale, timezone };
  const cardClass = "border-0 bg-transparent p-0 shadow-none";

  switch (item.type) {
    case "TRAINING":
      return (
        <SceTrainingCard
          model={resolveSceTrainingPresentationFromWeekplannerTraining(item, { tenantClubName })}
          density="COMPACT"
          fmtCfg={fmtCfg}
          linkToDetail={false}
          showStatus={false}
          surface="list-row"
          className={cardClass}
          testId={`planning-hub-liste-sce-training-${item.id}`}
        />
      );
    case "MATCH":
      return (
        <SceMatchCard
          model={resolveSceMatchPresentationFromWeekplannerMatch(item, { timezone })}
          density="COMPACT"
          fmtCfg={fmtCfg}
          linkToDetail={false}
          surface="list-row"
          className={cardClass}
          testId={`planning-hub-liste-sce-match-${item.id}`}
        />
      );
    case "TOURNAMENT":
      return (
        <SceTournamentCard
          model={resolveSceTournamentPresentationFromWeekplannerTournament(item, { tenantClubName })}
          density="COMPACT"
          fmtCfg={fmtCfg}
          linkToDetail={false}
          showStatus={false}
          surface="list-row"
          className={cardClass}
          testId={`planning-hub-liste-sce-tournament-${item.id}`}
        />
      );
    case "VERANSTALTUNG":
      return (
        <SceClubEventCard
          model={resolveSceClubEventPresentationFromWeekplannerVeranstaltung(item, {
            tenantClubName,
            tenantLogoUrl,
          })}
          density="COMPACT"
          fmtCfg={fmtCfg}
          linkToDetail={false}
          showStatus={false}
          surface="list-row"
          className={cardClass}
          testId={`planning-hub-liste-sce-club-event-${item.id}`}
        />
      );
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

export default function PlanningHubListeActivityRow({
  item,
  dayKey,
  locale,
  timezone,
  tenantClubName,
  tenantLogoUrl,
  activeAlternativePlanName,
  onItemOpen,
  onItemEditPlanning,
  onReviewConflictForItem,
  canEditItem,
  permissionContext,
}: PlanningHubListeActivityRowProps) {
  const status = listOperationalRowStatus(item);
  const semantic = activityVisualStyle(item.type);
  const presentationModel = resolvePlanningHubListePresentationModel(item, {
    tenantClubName,
    tenantLogoUrl,
    timezone,
  });
  const locationLine = planningHubListeLocationLine(item, presentationModel);
  const locationTitle = locationLine.length > 48 ? locationLine : undefined;

  return (
    <li>
      <div
        className={cn(
          LISTE_ROW_GRID,
          semantic.listLeftEdgeClass,
          "border-l-[3px]",
          status === "conflict" && "ring-1 ring-inset ring-amber-500/20",
        )}
        data-testid={`planning-hub-liste-row-${item.id}`}
        data-sce-planning-hub-liste-row
        data-sce-planning-hub-liste-activity-kind={item.type}
        data-sce-planning-hub-liste-grid={PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS}
      >
        <button
          type="button"
          onClick={() => onItemOpen(item)}
          data-testid={`weekplanner-item-${item.type.toLowerCase()}`}
          aria-label={weekplannerAccessibleName(item, locale, timezone)}
          className={cn(
            "contents",
            "focus-visible:outline-none [&_*:focus-visible]:ring-2 [&_*:focus-visible]:ring-[var(--sce-primary)]",
          )}
        >
          <p
            className={cn(
              "inline-flex min-w-0 items-center gap-1.5 text-[0.9375rem] font-semibold tabular-nums leading-snug text-[var(--foreground)] md:flex-col md:items-start md:gap-0",
              PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.time,
            )}
            data-testid="planning-hub-liste-row-time"
            data-sce-planning-hub-liste-column="TIME"
          >
            <Clock className="hidden h-3.5 w-3.5 shrink-0 opacity-70 md:inline" aria-hidden />
            <span>{formatListeRowTime(item, dayKey, locale, timezone)}</span>
          </p>

          <div
            className={PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.identity}
            data-testid="planning-hub-liste-row-identity"
            data-sce-planning-hub-liste-column="IDENTITY"
          >
            <SceListeActivityCard
              item={item}
              locale={locale}
              timezone={timezone}
              tenantClubName={tenantClubName}
              tenantLogoUrl={tenantLogoUrl}
            />
            {activeAlternativePlanName ? (
              <WeekplannerListeOverrideIndicator
                item={item}
                planName={activeAlternativePlanName}
                locale={locale}
                timezone={timezone}
              />
            ) : null}
          </div>

          <p
            className={PLANNING_HUB_LISTE_LOCATION_CELL_CLASS}
            title={locationTitle}
            data-testid="planning-hub-liste-row-resources"
            data-sce-planning-hub-liste-location-owner
            data-sce-planning-hub-liste-column="LOCATION"
          >
            <span
              className={PLANNING_HUB_LISTE_LOCATION_ICON_SLOT_CLASS}
              data-sce-planning-hub-liste-location-icon-slot
              aria-hidden
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 line-clamp-2">{locationLine}</span>
          </p>

          <span
            className={cn(
              "inline-flex w-full max-w-full items-center justify-center truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide",
              PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.status,
              statusBadgeClass(status),
            )}
            data-testid="planning-hub-liste-row-status"
            data-sce-planning-hub-liste-column="STATUS"
          >
            {listOperationalStatusLabel(status)}
          </span>
        </button>

        <div
          className={cn("flex min-w-0 items-center justify-end", PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.actions)}
          data-sce-planning-hub-liste-column="ACTIONS"
        >
          <PlanningHubListeRowMenu
            item={item}
            permissionContext={permissionContext}
            canEditItem={canEditItem}
            onOpenItem={() => onItemOpen(item)}
            onEditPlanning={() => onItemEditPlanning(item)}
            onReviewConflict={() => onReviewConflictForItem(item)}
          />
        </div>
      </div>
    </li>
  );
}
