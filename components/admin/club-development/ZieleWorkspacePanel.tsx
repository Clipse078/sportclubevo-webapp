"use client";

import CreateTargetWorkspaceCollapsibleCard from "@/components/admin/targets/CreateTargetWorkspaceCollapsibleCard";
import TargetZieleCollapsibleCard from "@/components/admin/targets/TargetZieleCollapsibleCard";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";

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
      <div
        className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-10 text-center text-sm text-[var(--muted)]"
        data-testid="ziele-workspace-empty"
      >
        {canManageTargets
          ? "Noch keine Ziele in der Übersicht — legen Sie Schwerpunkte in der Strategie an oder erfassen Sie ein Ziel."
          : "Keine strategischen Ziele sichtbar."}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="ziele-workspace-panel">
      {/* data-sce-contextual-create-flow="inline-collapsible" — CreateTargetWorkspaceCollapsibleCard */}
      {canManageTargets ? <CreateTargetWorkspaceCollapsibleCard canCreate /> : null}
      <p className="text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.progressHint}</p>
      <p className="text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.progressScopeNote}</p>
      <div className="space-y-3">
        {targets.map((target) => (
          <TargetZieleCollapsibleCard
            key={target.id}
            target={target}
            isFocus={focusTargetIds.has(target.id)}
          />
        ))}
      </div>
    </div>
  );
}