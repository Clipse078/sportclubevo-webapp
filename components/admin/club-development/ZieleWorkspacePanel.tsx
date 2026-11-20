"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { buildVereinsentwicklungZielNeuHref } from "@/lib/club-development/vereinsentwicklung-create-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import { formatTargetStatusLabel } from "@/lib/targets/target-presentation";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import { buildZielDetailHref } from "@/lib/club-development/vereinsentwicklung-target-task-create-routing";
import { buildStrategieReturnHref } from "@/lib/club-development/vereinsentwicklung-create-routing";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
import { VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS } from "./vereinsentwicklung-workspace-primary-button";

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
    <Link
      href={buildVereinsentwicklungZielNeuHref({ orgUnitId: orgQuery })}
      className={VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS}
      data-testid="ziele-toolbar-create"
      data-sce-contextual-create-flow="full-page"
    >
      + Ziel anlegen
    </Link>
  ) : null;

  return (
    <div className="space-y-4" data-testid="ziele-workspace-panel">
      <VereinsentwicklungWorkspaceToolbar
        orgEinheitFilterLabel={orgEinheitFilterLabel}
        primaryAction={primaryAction}
        testId="ziele-workspace-toolbar"
      />

      <div className={`${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-3`}>
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
                    progressPercent={target.deliveryProgressPercent ?? 0}
                    progressCaption={target.deliveryProgressCaption}
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