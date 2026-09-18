import type { TurniereRecordResourcePresentation } from "@/lib/tournaments/turniere-record-presentation";
import { cn } from "@/lib/cn";

type Props = {
  presentation: TurniereRecordResourcePresentation;
  className?: string;
  testId?: string;
};

function ResourceChip({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-[1.75rem] items-center rounded-md border border-[var(--border)]/80 bg-[var(--surface-2)]/80 px-2.5 text-xs font-semibold tabular-nums text-[var(--foreground)]">
      {label}
    </span>
  );
}

export default function TurniereTournamentRecordResourceSummary({
  presentation,
  className,
  testId = "turniere-record-resource-summary",
}: Props) {
  const hasAny =
    presentation.facilityName ||
    presentation.pitchCodes.length > 0 ||
    presentation.dressingRoomCodes.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-[var(--text-2)]" data-testid={testId}>
        Noch keine Ressourcen zugeordnet.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)} data-testid={testId}>
      {presentation.facilityName ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            Anlage
          </p>
          <p className="text-sm font-medium text-[var(--foreground)]">{presentation.facilityName}</p>
        </div>
      ) : null}

      {presentation.pitchCodes.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            Spielfelder
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presentation.pitchCodes.map((code) => (
              <ResourceChip key={code} label={code} />
            ))}
          </div>
        </div>
      ) : null}

      {presentation.dressingRoomCodes.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            Garderoben
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presentation.dressingRoomCodes.map((code) => (
              <ResourceChip key={code} label={code} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
