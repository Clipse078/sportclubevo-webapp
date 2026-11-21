"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import { formatTargetStatusLabel } from "@/lib/targets/target-presentation";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import StrategyProgressIndicator from "./StrategyProgressIndicator";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import { buildZielDetailHref } from "@/lib/club-development/vereinsentwicklung-target-task-create-routing";
import { buildStrategieReturnHref } from "@/lib/club-development/vereinsentwicklung-create-routing";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
import { VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS } from "./vereinsentwicklung-workspace-primary-button";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import CreateTargetWorkspaceCollapsibleCard from "@/components/admin/targets/CreateTargetWorkspaceCollapsibleCard";

type Props = {
  targets: StrategyTargetOverview[];
  strategies: ClubStrategyListItemDto[];
  focusTargetIds: ReadonlySet<string>;
  canManageTargets: boolean;
  canCreateTargetTasks?: boolean;
  orgEinheitFilterLabel?: string | null;
};

export default function ZieleWorkspacePanel({
  targets,
  strategies,
  focusTargetIds,
  canManageTargets,
  orgEinheitFilterLabel = null,
}: Props) {
  const searchParams = useSearchParams();
  const orgQuery = searchParams.get(CD_WORKSPACE_ORG_UNIT_QUERY);
  const [createOpen, setCreateOpen] = useState(false);

  const strategyLinkByTargetId = useMemo(() => {
    const map = new Map<string, { title: string; href: string }>();
    for (const strategy of strategies) {
      for (const targetId of strategy.focusTargetIds) {
        if (!map.has(targetId)) {
          map.set(targetId, {
            title: strategy.title,
            href: buildStrategieReturnHref({ orgUnitId: orgQuery, strategyId: strategy.id }),
          });
        }
      }
    }
    return map;
  }, [strategies, orgQuery]);

  const primaryAction = canManageTargets ? (
    <button
      type="button"
      className={VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS}
      data-testid="ziele-toolbar-create"
      data-sce-contextual-create-flow="inline-collapsible"
      onClick={() => setCreateOpen(true)}
    >
      + Ziel anlegen
    </button>
  ) : null;

  return (
    <div className="space-y-4" data-testid="ziele-workspace-panel">
      <VereinsentwicklungWorkspaceToolbar
        orgEinheitFilterLabel={orgEinheitFilterLabel}
        primaryAction={primaryAction}
        testId="ziele-workspace-toolbar"
      />

      {canManageTargets ? (
        <CreateTargetWorkspaceCollapsibleCard
          canCreate
          expanded={createOpen}
          onExpandedChange={setCreateOpen}
          hideToolbarTrigger
        />
      ) : null}

      <div className={`${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-3`}>
        {targets.length === 0 ? (
          <SceClubDevelopmentEmptyState
            testId="ziele-workspace-empty"
            message={
              canManageTargets
                ? "Noch keine Ziele sichtbar — legen Sie ein Ziel an."
                : "Keine strategischen Ziele sichtbar."
            }
            action={
              canManageTargets ? (
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
                  onClick={() => setCreateOpen(true)}
                >
                  + Ziel anlegen
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div
              className="hidden text-[10px] font-medium uppercase tracking-wide text-[var(--muted)] sm:grid sm:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.65fr))] sm:gap-3 sm:px-3"
              aria-hidden
            >
              <span>Titel</span>
              <span>Strategie</span>
              <span>Verantwortlich</span>
              <span>Org-Einheit</span>
              <span>{CD_STRATEGY_PROGRESS_COPY.taskProgressLabel}</span>
            </div>
            <div className="space-y-2" data-testid="ziele-workspace-list">
              {targets.map((target) => {
                const isFocus = focusTargetIds.has(target.id);
                const detailHref = buildZielDetailHref(target.id, orgQuery);
                const strategyLink =
                  target.linkedClubStrategyTitle && target.linkedClubStrategyId
                    ? {
                        title: target.linkedClubStrategyTitle,
                        href: buildStrategieReturnHref({
                          orgUnitId: orgQuery,
                          strategyId: target.linkedClubStrategyId,
                        }),
                      }
                    : strategyLinkByTargetId.get(target.id) ?? null;
                const strategyLabel = strategyLink?.title ?? "—";
                const orgUnitLabel =
                  target.orgUnitLabel?.trim() ||
                  (isFocus ? "Schwerpunkt" : null) ||
                  "—";
                return (
                  <VereinsentwicklungWorkspaceRecordRow
                    key={target.id}
                    title={target.title}
                    titleHref={detailHref}
                    strategyLabel={strategyLabel}
                    strategyHref={strategyLink?.href ?? null}
                    responsibleLabel={target.responsibleLabel}
                    orgUnitLabel={orgUnitLabel}
                    progressSlot={
                      <StrategyProgressIndicator
                        variant="compact"
                        label={CD_STRATEGY_PROGRESS_COPY.taskProgressLabel}
                        percent={
                          target.deliveryProgressCaption === "Noch keine Aufgaben"
                            ? null
                            : target.deliveryProgressPercent
                        }
                        unknownReason={
                          target.deliveryProgressCaption === "Noch keine Aufgaben" ? "Noch keine Aufgaben" : null
                        }
                        countCaption={
                          target.deliveryProgressCaption === "Noch keine Aufgaben"
                            ? null
                            : target.deliveryProgressCaption
                        }
                        accentClass="bg-[var(--sce-info)]"
                        testId={`ziele-task-progress-${target.id}`}
                      />
                    }
                    statusLabel={formatTargetStatusLabel(target.status)}
                    testId={`ziele-row-${target.id}`}
                    trailing={
                      <Link href={detailHref} className="text-xs text-[var(--sce-primary)] hover:underline">
                        Öffnen
                      </Link>
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}