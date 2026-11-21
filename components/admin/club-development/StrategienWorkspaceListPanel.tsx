"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import SceCompletionProgressInline from "./SceCompletionProgressInline";
import VereinsentwicklungBacklogTableShell from "./VereinsentwicklungBacklogTableShell";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import { buildStrategieUndZieleHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import {
  SCE_CD_OVERVIEW_UNIFIED_GRID,
  SCE_CD_WORKSPACE_PANEL_CLASS,
} from "./sce-club-development-surface-styles";
import { VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS } from "./vereinsentwicklung-workspace-primary-button";
import CreateStrategieWorkspaceCollapsibleCard from "./CreateStrategieWorkspaceCollapsibleCard";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";

type Props = {
  strategies: ClubStrategyListItemDto[];
  selectedStrategyId: string | null;
  canManage: boolean;
  orgUnitOptions: TaskOrgUnitPickerOption[];
  orgEinheitFilterLabel?: string | null;
  timeZone: string;
};

export default function StrategienWorkspaceListPanel({
  strategies,
  selectedStrategyId,
  canManage,
  orgUnitOptions,
  orgEinheitFilterLabel = null,
  timeZone,
}: Props) {
  const searchParams = useSearchParams();
  const orgQuery = searchParams.get(CD_WORKSPACE_ORG_UNIT_QUERY);
  const [createOpen, setCreateOpen] = useState(false);

  const primaryAction = canManage ? (
    <button
      type="button"
      className={VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS}
      data-testid="strategien-toolbar-create"
      data-sce-contextual-create-flow="inline-collapsible"
      onClick={() => setCreateOpen(true)}
    >
      + Strategie anlegen
    </button>
  ) : null;

  return (
    <div className="space-y-4" data-testid="strategien-workspace-panel">
      <VereinsentwicklungWorkspaceToolbar
        orgEinheitFilterLabel={orgEinheitFilterLabel}
        primaryAction={primaryAction}
        testId="strategien-workspace-toolbar"
      />

      {canManage ? (
        <CreateStrategieWorkspaceCollapsibleCard
          canCreate
          orgUnitOptions={orgUnitOptions}
          timeZone={timeZone}
          expanded={createOpen}
          onExpandedChange={setCreateOpen}
          hideToolbarTrigger
        />
      ) : null}

      <div className={SCE_CD_WORKSPACE_PANEL_CLASS} data-testid="strategien-workspace-list-surface">
        {strategies.length === 0 ? (
          <SceClubDevelopmentEmptyState
            testId="strategien-workspace-empty"
            message={
              canManage
                ? "Noch keine Strategie sichtbar — legen Sie eine Strategie an."
                : "Keine Strategie sichtbar."
            }
            action={
              canManage ? (
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
                  onClick={() => setCreateOpen(true)}
                >
                  + Strategie anlegen
                </button>
              ) : null
            }
          />
        ) : (
          <VereinsentwicklungBacklogTableShell
            testId="strategien-workspace-list"
            gridClassName={SCE_CD_OVERVIEW_UNIFIED_GRID}
            header={
              <>
                <span>Referenz</span>
                <span>Titel</span>
                <span>Org-Einheit</span>
                <span aria-hidden />
                <span>{CD_STRATEGY_PROGRESS_COPY.goalAchievementLabel}</span>
                <span aria-hidden />
                <span className="sr-only">Aktionen</span>
              </>
            }
          >
            {strategies.map((strategy) => {
              const params: Record<string, string | undefined> = {
                strategyId: strategy.id,
              };
              if (orgQuery) params[CD_WORKSPACE_ORG_UNIT_QUERY] = orgQuery;
              const href = buildStrategieUndZieleHref("strategie", params);
              const isSelected = selectedStrategyId === strategy.id;
              const goalEmpty =
                strategy.goalAchievementCaption === CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty;
              return (
                <div
                  key={strategy.id}
                  className={isSelected ? "bg-[color-mix(in_srgb,var(--sce-primary)_6%,transparent)]" : undefined}
                >
                  <VereinsentwicklungWorkspaceRecordRow
                    variant="strategy"
                    publicReference={strategy.publicReference}
                    title={strategy.title}
                    titleHref={href}
                    orgUnitLabel={strategy.scopeOrgUnitLabel}
                    progressSlot={
                      strategy.goalAchievementTotalCount > 0 ? (
                        <SceCompletionProgressInline
                          metricLabel={CD_STRATEGY_PROGRESS_COPY.goalAchievementLabel}
                          completedCount={strategy.goalAchievementCompletedCount}
                          totalCount={strategy.goalAchievementTotalCount}
                          countCaption={null}
                          emptyLabel={CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty}
                          countSuffix="erledigt"
                          captionPriority
                          testId={`strategien-goal-progress-${strategy.id}`}
                        />
                      ) : (
                        <SceCompletionProgressInline
                          metricLabel={CD_STRATEGY_PROGRESS_COPY.goalAchievementLabel}
                          countCaption={goalEmpty ? null : strategy.goalAchievementCaption}
                          emptyLabel={CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty}
                          countSuffix="erledigt"
                          captionPriority
                          testId={`strategien-goal-progress-${strategy.id}`}
                        />
                      )
                    }
                    testId={`strategien-row-${strategy.id}`}
                    trailing={
                      <Link
                        href={href}
                        className="inline-flex rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sce-primary)]"
                        aria-label={`${strategy.title} öffnen`}
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden />
                      </Link>
                    }
                  />
                </div>
              );
            })}
          </VereinsentwicklungBacklogTableShell>
        )}
      </div>
    </div>
  );
}