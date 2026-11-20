"use client";

import Link from "next/link";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import { buildStrategieUndZieleHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import { useSearchParams } from "next/navigation";

type Props = {
  strategies: ClubStrategyListItemDto[];
  selectedStrategyId: string | null;
};

export default function StrategienWorkspaceListPanel({ strategies, selectedStrategyId }: Props) {
  const searchParams = useSearchParams();
  const orgQuery = searchParams.get(CD_WORKSPACE_ORG_UNIT_QUERY);

  if (strategies.length === 0) {
    return (
      <SceClubDevelopmentEmptyState
        testId="strategien-workspace-empty"
        message="Noch keine Strategie sichtbar."
      />
    );
  }

  return (
    <SceClubDevelopmentSectionShell title="Strategien" bodyClassName="p-5 space-y-3">
      <p className="text-xs text-[var(--muted)]">
        Wählen Sie eine Strategie, um verknüpfte Ziele und Inhalte zu bearbeiten.
      </p>
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
                orgUnitLabel={strategy.scopeOrgUnitLabel ?? "Gesamtverein"}
                progressCaption={`${strategy.focusTargetCount} verknüpfte Ziele`}
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
    </SceClubDevelopmentSectionShell>
  );
}