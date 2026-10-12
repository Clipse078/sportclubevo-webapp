import type { TeamCockpitResult } from "@/lib/teams/team-cockpit-sporting-data";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import TeamResultRow from "./TeamResultRow";

type Props = {
  results: TeamCockpitResult[];
  seasonName: string | null;
  formatConfig: TenantFormatConfig;
};

export default function TeamResultsView({
  results,
  seasonName,
  formatConfig,
}: Props) {
  return (
    <div className="space-y-5" data-testid="team-results-view">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Resultate</h2>
        {seasonName ? (
          <p className="text-sm text-[var(--muted)]">
            Abgeschlossene Spiele der aktuellen Saison ({seasonName}).
          </p>
        ) : null}
      </header>

      {results.length === 0 ? (
        <div
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3"
          data-testid="team-results-empty"
        >
          <p className="text-sm text-[var(--muted)]">
            {seasonName
              ? `Keine Resultate für ${seasonName} vorhanden.`
              : "Keine Resultate vorhanden."}
          </p>
        </div>
      ) : (
        <ol
          className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          data-testid="team-results-list"
        >
          {results.map((result) => (
            <li key={result.eventId} className="min-w-0">
              <TeamResultRow result={result} formatConfig={formatConfig} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
