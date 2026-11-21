"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import StrategyProgressIndicator from "./StrategyProgressIndicator";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import { buildStrategieUndZieleHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
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

      <div className={`${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-3`} data-testid="strategien-workspace-list-surface">
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
          <>
            <div
              className="hidden text-[10px] font-medium uppercase tracking-wide text-[var(--muted)] sm:grid sm:grid-cols-[minmax(0,1.05fr)_minmax(0,0.58fr)_minmax(0,0.58fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto] sm:gap-3 sm:px-3"
              aria-hidden
            >
              <span>Titel</span>
              <span>Verantwortlich</span>
              <span>Org-Einheiten</span>
              <span>{CD_STRATEGY_PROGRESS_COPY.goalAchievementLabel}</span>
              <span>{CD_STRATEGY_PROGRESS_COPY.deliveryLabel}</span>
              <span className="sr-only">Aktionen</span>
            </div>
            <div className="space-y-2" data-testid="strategien-workspace-list">
              {strategies.map((strategy) => {
                const params: Record<string, string | undefined> = {
                  strategyId: strategy.id,
                };
                if (orgQuery) params[CD_WORKSPACE_ORG_UNIT_QUERY] = orgQuery;
                const href = buildStrategieUndZieleHref("strategie", params);
                const isSelected = selectedStrategyId === strategy.id;

                return (
                  <div
                    key={strategy.id}
                    className={isSelected ? "ring-1 ring-[var(--sce-primary)] rounded-lg" : undefined}
                  >
                    <VereinsentwicklungWorkspaceRecordRow
                      title={strategy.title}
                      titleHref={href}
                      responsibleLabel={strategy.responsibleLabel}
                      orgUnitLabel={strategy.scopeOrgUnitLabel}
                      progressSlot={
                        <StrategyProgressIndicator
                          variant="compact"
                          label={CD_STRATEGY_PROGRESS_COPY.goalAchievementLabel}
                          percent={
                            strategy.goalAchievementCaption === CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty
                              ? null
                              : strategy.goalAchievementPercent
                          }
                          unknownReason={
                            strategy.goalAchievementCaption === CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty
                              ? CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty
                              : null
                          }
                          countCaption={
                            strategy.goalAchievementCaption === CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty
                              ? null
                              : strategy.goalAchievementCaption
                          }
                          testId={`strategien-goal-progress-${strategy.id}`}
                        />
                      }
                      secondaryProgressSlot={
                        <StrategyProgressIndicator
                          variant="compact"
                          label={CD_STRATEGY_PROGRESS_COPY.deliveryLabel}
                          percent={
                            strategy.deliveryProgressCaption === "Noch keine Aufgaben"
                              ? null
                              : strategy.deliveryProgressPercent
                          }
                          unknownReason={
                            strategy.deliveryProgressCaption === "Noch keine Aufgaben" ? "Noch keine Aufgaben" : null
                          }
                          countCaption={
                            strategy.deliveryProgressCaption === "Noch keine Aufgaben"
                              ? null
                              : strategy.deliveryProgressCaption
                          }
                          accentClass="bg-[var(--sce-info)]"
                          testId={`strategien-delivery-progress-${strategy.id}`}
                        />
                      }
                      testId={`strategien-row-${strategy.id}`}
                      trailing={
                        <Link href={href} className="text-xs text-[var(--sce-primary)] hover:underline">
                          Öffnen
                        </Link>
                      }
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}