"use client";

import { cn } from "@/lib/cn";
import { activityVisualStyle } from "@/lib/planning-hub/activity-visual-style";
import { weekplannerAccessibleName } from "@/lib/planning-hub/item-presenters";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { SceProgrammeActivityCardShell } from "@/components/sporting-activity/SceProgrammeActivityCardShell";
import PlanningHubActivityDetailSurface from "./PlanningHubActivityDetailSurface";
import PlanningHubListeRowMenu from "./PlanningHubListeRowMenu";
import PlanningHubListeSceActivityCard from "./PlanningHubListeSceActivityCard";
import { SceProgrammeActivityDateTile } from "@/components/sporting-activity/SceProgrammeActivityDateTile";
import { SCE_ACTIVITY_REFERENCE_LAYOUT } from "@/lib/sporting-activity-presentation/canonical/activity-card-reference-layout";
import PlannerOperationalIssueSummary from "./PlannerOperationalIssueSummary";
import WeekplannerListeOverrideIndicator from "./WeekplannerListeOverrideIndicator";
import {
  SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER,
  SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-full-width-list-contract";
import { PLANNING_HUB_LISTE_MATCH_ROW_GEOMETRY } from "@/lib/planning-hub/planning-hub-liste-match-geometry";

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

const LISTE_CARD_DETAIL_GEOMETRY = PLANNING_HUB_LISTE_MATCH_ROW_GEOMETRY;

export default function PlanningHubListeActivityRow({
  item,
  dayKey: _dayKey,
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
  const semantic = activityVisualStyle(item.type);
  const fmtCfg = { locale, timezone };
  const usesMatchcenterListComposition = item.type === "MATCH";

  return (
    <li className="min-w-0 list-none">
      <SceProgrammeActivityCardShell
        density="STANDARD"
        testId={`planning-hub-liste-row-${item.id}`}
        className={cn(
          "group w-full min-w-0",
          semantic.listLeftEdgeClass,
          "border-l-[3px]",
          item.conflicts.length > 0 && "ring-1 ring-inset ring-amber-500/15",
        )}
        data-sce-planning-hub-liste-row
        data-sce-planning-hub-liste-activity-kind={item.type}
        data-sce-planning-hub-liste-full-width-contract="canonical-shell"
        {...(usesMatchcenterListComposition
          ? {
              [SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR]: SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER,
            }
          : {})}
      >
        <div
          className={cn(
            "flex min-w-0 w-full items-stretch gap-1",
            usesMatchcenterListComposition && "relative",
          )}
        >
          {usesMatchcenterListComposition ? (
            <div
              className="absolute right-2 top-2 z-[2] sm:right-3 sm:top-3"
              data-sce-planning-hub-liste-menu-anchor
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
          ) : null}

          <div
            className={cn(
              "min-w-0",
              usesMatchcenterListComposition ? "w-full flex-1 self-stretch" : "flex-1 self-stretch",
            )}
            data-sce-planning-hub-liste-measured-row
          >
            <PlanningHubActivityDetailSurface
              item={item}
              locale={locale}
              timezone={timezone}
              geometry={LISTE_CARD_DETAIL_GEOMETRY}
            >
              {(referenceProps) => (
                <button
                  type="button"
                  onClick={() => onItemOpen(item)}
                  data-testid={`weekplanner-item-${item.type.toLowerCase()}`}
                  aria-label={weekplannerAccessibleName(item, locale, timezone)}
                  className={cn(
                    "block w-full min-w-0 self-stretch rounded-[inherit] text-left",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-inset",
                  )}
                  {...referenceProps}
                >
                  {usesMatchcenterListComposition ? (
                    <div
                      className="flex min-w-0 w-full flex-col gap-2.5"
                      data-testid={`planning-hub-liste-match-card-${item.id}`}
                    >
                      <div className="min-w-0 w-full max-md:pr-8">
                        <PlanningHubListeSceActivityCard
                          item={item}
                          fmtCfg={fmtCfg}
                          density="STANDARD"
                          tenantClubName={tenantClubName}
                          tenantLogoUrl={tenantLogoUrl}
                        />
                      </div>
                      <PlannerOperationalIssueSummary item={item} />
                    </div>
                  ) : (
                  <div
                    className={SCE_ACTIVITY_REFERENCE_LAYOUT.planningHubListeRowShellClass}
                    data-sce-planning-hub-liste-leading-date
                  >
                    <SceProgrammeActivityDateTile
                      startAt={new Date(item.canonicalStartAt ?? item.startAt)}
                      fmtCfg={fmtCfg}
                      testId={`planning-hub-liste-date-tile-${item.id}`}
                    />
                    <div className="min-w-0 flex-1 self-stretch">
                      <PlanningHubListeSceActivityCard
                        item={item}
                        fmtCfg={fmtCfg}
                        density="STANDARD"
                        tenantClubName={tenantClubName}
                        tenantLogoUrl={tenantLogoUrl}
                        issueSummary={<PlannerOperationalIssueSummary item={item} />}
                      />
                    </div>
                  </div>
                )}
                {activeAlternativePlanName ? (
                  <WeekplannerListeOverrideIndicator
                    item={item}
                    planName={activeAlternativePlanName}
                    locale={locale}
                    timezone={timezone}
                  />
                ) : null}
              </button>
              )}
            </PlanningHubActivityDetailSurface>
          </div>

          {!usesMatchcenterListComposition ? (
            <div
              className="flex shrink-0 items-start justify-end self-stretch pt-2 pr-0.5 sm:pt-2.5 sm:pr-1"
              data-sce-planning-hub-liste-column="ACTIONS"
              data-sce-planning-hub-liste-menu-anchor
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
          ) : null}
        </div>
      </SceProgrammeActivityCardShell>
    </li>
  );
}
