"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import type { TargetStatus } from "@prisma/client";
import { formatTargetStatusLabel } from "@/lib/targets/target-presentation";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import SceCompletionProgressInline from "./SceCompletionProgressInline";
import VereinsentwicklungBacklogTableShell from "./VereinsentwicklungBacklogTableShell";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import { buildZielDetailHref } from "@/lib/club-development/vereinsentwicklung-target-task-create-routing";
import { buildStrategieReturnHref } from "@/lib/club-development/vereinsentwicklung-create-routing";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import {
  SCE_CD_BACKLOG_GRID_ZIEL,
  SCE_CD_WORKSPACE_PANEL_CLASS,
} from "./sce-club-development-surface-styles";
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

      <div className={SCE_CD_WORKSPACE_PANEL_CLASS}>
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
          <VereinsentwicklungBacklogTableShell
            testId="ziele-workspace-list"
            gridClassName={SCE_CD_BACKLOG_GRID_ZIEL}
            header={
              <>
                <span>Titel</span>
                <span>Strategie</span>
                <span>Status</span>
                <span>{CD_STRATEGY_PROGRESS_COPY.taskProgressLabel}</span>
                <span>Verantwortlich</span>
                <span className="sr-only">Aktionen</span>
              </>
            }
          >
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
                target.orgUnitLabel?.trim() || (isFocus ? "Schwerpunkt" : null);
              const deliveryEmpty = target.deliveryProgressCaption === "Noch keine Aufgaben";

              return (
                <VereinsentwicklungWorkspaceRecordRow
                  key={target.id}
                  variant="target"
                  title={target.title}
                  titleHref={detailHref}
                  strategyLabel={strategyLabel}
                  strategyHref={strategyLink?.href ?? null}
                  orgUnitLabel={orgUnitLabel}
                  responsibleLabel={target.responsibleLabel}
                  status={target.status as TargetStatus}
                  statusLabel={formatTargetStatusLabel(target.status)}
                  progressSlot={
                    <SceCompletionProgressInline
                      metricLabel={CD_STRATEGY_PROGRESS_COPY.taskProgressLabel}
                      countCaption={deliveryEmpty ? null : target.deliveryProgressCaption}
                      emptyLabel="Noch keine Aufgaben"
                      countSuffix="erledigt"
                      accentClass="bg-[var(--sce-info)]"
                      testId={`ziele-task-progress-${target.id}`}
                    />
                  }
                  testId={`ziele-row-${target.id}`}
                  trailing={
                    <>
                      <Link
                        href={detailHref}
                        className="hidden text-xs font-medium text-[var(--sce-primary)] hover:underline sm:inline"
                      >
                        Öffnen
                      </Link>
                      <Link
                        href={detailHref}
                        className="inline-flex rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                        aria-label={`${target.title} öffnen`}
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden />
                      </Link>
                    </>
                  }
                />
              );
            })}
          </VereinsentwicklungBacklogTableShell>
        )}
      </div>
    </div>
  );
}