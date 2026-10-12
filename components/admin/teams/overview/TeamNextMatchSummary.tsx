import Link from "next/link";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import type { TeamCockpitMatch } from "@/lib/teams/team-cockpit-sporting-data";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

type Props = {
  teamId: string;
  match: TeamCockpitMatch | null;
  formatConfig: TenantFormatConfig;
};

export default function TeamNextMatchSummary({
  teamId,
  match,
  formatConfig,
}: Props) {
  const href = `/dashboard/teams/${teamId}/spiele`;

  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-3 p-4 transition-colors hover:bg-[var(--surface-2)]/60"
      aria-label="Nächstes Spiel — Details in Nächste Spiele"
      data-testid="team-next-match-summary"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">
          Nächstes Spiel
        </h3>
        <span className="text-xs font-medium text-[var(--blue)] group-hover:underline">
          Alle Spiele
        </span>
      </div>

      {match ? (
        <SceMatchCard
          model={match.scePresentation}
          density="COMPACT"
          fmtCfg={formatConfig}
          linkToDetail={false}
          testId="team-next-match-sce-card"
        />
      ) : (
        <p className="text-sm text-[var(--muted)]" data-testid="team-next-match-empty">
          Kein nächstes Spiel geplant.
        </p>
      )}
    </Link>
  );
}
