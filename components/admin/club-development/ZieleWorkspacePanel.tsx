"use client";

import CreateTargetWorkspaceCollapsibleCard from "@/components/admin/targets/CreateTargetWorkspaceCollapsibleCard";
import TargetZieleCollapsibleCard from "@/components/admin/targets/TargetZieleCollapsibleCard";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";

type Props = {
  targets: StrategyTargetOverview[];
  focusTargetIds: ReadonlySet<string>;
  canManageTargets: boolean;
};

export default function ZieleWorkspacePanel({
  targets,
  focusTargetIds,
  canManageTargets,
}: Props) {
  if (targets.length === 0) {
    return (
      <div className="space-y-4" data-testid="ziele-workspace-empty">
        {canManageTargets ? <CreateTargetWorkspaceCollapsibleCard canCreate /> : null}
        <SceClubDevelopmentEmptyState
          message={
            canManageTargets
              ? "Noch keine Ziele sichtbar — legen Sie ein erstes Ziel an und verknüpfen Sie es in der Strategie."
              : "Keine strategischen Ziele sichtbar."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="ziele-workspace-panel">
      {/* data-sce-contextual-create-flow="inline-collapsible" — CreateTargetWorkspaceCollapsibleCard */}
      {canManageTargets ? <CreateTargetWorkspaceCollapsibleCard canCreate /> : null}
      <SceClubDevelopmentSectionShell title="Alle Ziele" bodyClassName="p-5 space-y-3">
        <p className="text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.progressHint}</p>
        <div className="space-y-3">
          {targets.map((target) => (
            <TargetZieleCollapsibleCard
              key={target.id}
              target={target}
              isFocus={focusTargetIds.has(target.id)}
            />
          ))}
        </div>
      </SceClubDevelopmentSectionShell>
    </div>
  );
}