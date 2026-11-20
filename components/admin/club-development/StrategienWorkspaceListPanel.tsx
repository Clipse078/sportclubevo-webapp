"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import { buildStrategieUndZieleHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import { useSearchParams } from "next/navigation";
import CreateStrategieWorkspaceCollapsibleCard from "./CreateStrategieWorkspaceCollapsibleCard";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
import { VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS } from "./vereinsentwicklung-workspace-primary-button";
type Props = {
  strategies: ClubStrategyListItemDto[];
  selectedStrategyId: string | null;
  canManage: boolean;
  orgUnitOptions: { id: string; name: string }[];
  orgEinheitFilterLabel?: string | null;
};

export default function StrategienWorkspaceListPanel({
  strategies,
  selectedStrategyId,
  canManage,
  orgUnitOptions,
  orgEinheitFilterLabel = null,
}: Props) {
  const searchParams = useSearchParams();
  const orgQuery = searchParams.get(CD_WORKSPACE_ORG_UNIT_QUERY);
  const [createOpen, setCreateOpen] = useState(false);

  const primaryAction =
    canManage ? (
      <button
        type="button"
        className={VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS}
        onClick={() => setCreateOpen(true)}
        data-testid="strategien-toolbar-create"
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

      <div className={`${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-3`} data-testid="strategien-workspace-list-surface">
        {canManage ? (
          <CreateStrategieWorkspaceCollapsibleCard
            canCreate
            orgUnitOptions={orgUnitOptions}
            expanded={createOpen}
            onExpandedChange={setCreateOpen}
            hideToolbarTrigger
          />
        ) : null}

        {strategies.length === 0 ? (
          <SceClubDevelopmentEmptyState
            testId="strategien-workspace-empty"
            message={
              canManage
                ? "Noch keine Strategie sichtbar — legen Sie eine Strategie an."
                : "Keine Strategie sichtbar."
            }
          />
        ) : (
          <>
            <div
              className="hidden text-[10px] font-medium uppercase tracking-wide text-[var(--muted)] sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))_auto] sm:gap-3 sm:px-3"
              aria-hidden
            >
              <span>Titel</span>
              <span>Verantwortlich</span>
              <span>Org-Einheiten</span>
              <span>Umsetzungsfortschritt</span>
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
                      progressPercent={strategy.deliveryProgressPercent}
                      progressCaption={strategy.deliveryProgressCaption}
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