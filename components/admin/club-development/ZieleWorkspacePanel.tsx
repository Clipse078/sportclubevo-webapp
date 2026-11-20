"use client";

import { useMemo, useState } from "react";
import CreateTargetWorkspaceCollapsibleCard from "@/components/admin/targets/CreateTargetWorkspaceCollapsibleCard";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import { formatTargetStatusLabel } from "@/lib/targets/target-presentation";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
import { VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS } from "./vereinsentwicklung-workspace-primary-button";

type Props = {
  targets: StrategyTargetOverview[];
  strategies: ClubStrategyListItemDto[];
  focusTargetIds: ReadonlySet<string>;
  canManageTargets: boolean;
  orgEinheitFilterLabel?: string | null;
};

export default function ZieleWorkspacePanel({
  targets,
  strategies,
  focusTargetIds,
  canManageTargets,
  orgEinheitFilterLabel = null,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  const strategyTitleByTargetId = useMemo(() => {
    const map = new Map<string, string>();
    for (const strategy of strategies) {
      for (const targetId of strategy.focusTargetIds) {
        if (!map.has(targetId)) map.set(targetId, strategy.title);
      }
    }
    return map;
  }, [strategies]);

  const primaryAction = canManageTargets ? (
    <button
      type="button"
      className={VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS}
      onClick={() => setCreateOpen(true)}
      data-testid="ziele-toolbar-create"
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

      <div className={`${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-3`}>
        {canManageTargets ? (
          <CreateTargetWorkspaceCollapsibleCard
            canCreate
            expanded={createOpen}
            onExpandedChange={setCreateOpen}
            hideToolbarTrigger
          />
        ) : null}

        {targets.length === 0 ? (
          <SceClubDevelopmentEmptyState
            testId="ziele-workspace-empty"
            message={
              canManageTargets
                ? "Noch keine Ziele sichtbar — legen Sie ein Ziel an."
                : "Keine strategischen Ziele sichtbar."
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
              <span>Umsetzungsfortschritt</span>
            </div>
            <div className="space-y-2" data-testid="ziele-workspace-list">
              {targets.map((target) => {
                const isFocus = focusTargetIds.has(target.id);
                const detailHref = `/vereinsleitung/targets/${encodeURIComponent(target.id)}`;
                const strategyLabel = strategyTitleByTargetId.get(target.id) ?? "—";
                return (
                  <VereinsentwicklungWorkspaceRecordRow
                    key={target.id}
                    title={target.title}
                    titleHref={detailHref}
                    strategyLabel={strategyLabel}
                    responsibleLabel={null}
                    orgUnitLabel={isFocus ? "Schwerpunkt" : "—"}
                    progressPercent={target.deliveryProgressPercent}
                    progressCaption={
                      target.deliveryProgressPercent != null
                        ? `${target.deliveryProgressPercent}%`
                        : null
                    }
                    statusLabel={formatTargetStatusLabel(target.status)}
                    testId={`ziele-row-${target.id}`}
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