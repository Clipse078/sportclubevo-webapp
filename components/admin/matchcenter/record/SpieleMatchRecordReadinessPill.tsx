import { cn } from "@/lib/cn";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";

type Props = {
  assessment: MatchcenterOperationalAssessment;
  homeAway: string | null;
  className?: string;
};

export default function SpieleMatchRecordReadinessPill({
  assessment,
  homeAway,
  className,
}: Props) {
  const normalized = homeAway?.trim().toUpperCase() ?? null;

  if (assessment.status === "NOT_APPLICABLE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]",
          className,
        )}
        data-testid="spiele-record-readiness-pill"
      >
        —
      </span>
    );
  }

  if (assessment.status === "AWAY" || normalized === "AWAY") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-sky-200",
          className,
        )}
        data-testid="spiele-record-readiness-pill"
      >
        Auswärtsspiel
      </span>
    );
  }

  if (assessment.status === "READY") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-emerald-200",
          className,
        )}
        data-testid="spiele-record-readiness-pill"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        Bereit
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-amber-100",
        className,
      )}
      data-testid="spiele-record-readiness-pill"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
      {assessment.actionCount} offen
    </span>
  );
}
