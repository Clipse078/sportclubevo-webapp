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
import PlannerOperationalIssueSummary from "./PlannerOperationalIssueSummary";
import WeekplannerListeOverrideIndicator from "./WeekplannerListeOverrideIndicator";

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

const LISTE_CARD_DETAIL_GEOMETRY = {
  blockWidthPx: 480,
  blockHeightPx: 96,
  compact: false,
} as const;

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
      >
        <div className="flex min-w-0 items-stretch gap-1">
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
                  "min-w-0 flex-1 self-stretch rounded-[inherit] text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-inset",
                )}
                {...referenceProps}
              >
                <PlanningHubListeSceActivityCard
                  item={item}
                  fmtCfg={fmtCfg}
                  density="STANDARD"
                  tenantClubName={tenantClubName}
                  tenantLogoUrl={tenantLogoUrl}
                  issueSummary={<PlannerOperationalIssueSummary item={item} />}
                />
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
        </div>
      </SceProgrammeActivityCardShell>
    </li>
  );
}
