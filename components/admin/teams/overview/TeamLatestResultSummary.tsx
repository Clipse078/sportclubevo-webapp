import Link from "next/link";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import type { TeamCockpitResult } from "@/lib/teams/team-cockpit-sporting-data";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

type Props = {
  teamId: string;
  result: TeamCockpitResult | null;
  formatConfig: TenantFormatConfig;
};

export default function TeamLatestResultSummary({
  teamId,
  result,
  formatConfig,
}: Props) {
  const href = `/dashboard/teams/${teamId}/resultate`;

  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-3 p-4 transition-colors hover:bg-[var(--surface-2)]/60"
      aria-label="Letztes Resultat — Details in Resultate"
      data-testid="team-latest-result-summary"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">
          Letztes Resultat
        </h3>
        <span className="text-xs font-medium text-[var(--blue)] group-hover:underline">
          Alle Resultate
        </span>
      </div>

      {result ? (
        <SceMatchCard
          model={result.scePresentation}
          density="COMPACT"
          fmtCfg={formatConfig}
          linkToDetail={false}
          testId="team-latest-result-sce-card"
        />
      ) : (
        <p className="text-sm text-[var(--muted)]" data-testid="team-latest-result-empty">
          Keine Resultate vorhanden.
        </p>
      )}
    </Link>
  );
}
