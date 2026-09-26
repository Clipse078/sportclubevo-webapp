import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { CalendarRange, MapPin } from "lucide-react";
import TrainingRecordStatusBadge from "./TrainingRecordStatusBadge";
import type { TrainingSeriesStatus } from "@/lib/training/types";

type Props = {
  status: TrainingSeriesStatus;
  teamLabel: string;
  scheduleSummary: string | null;
  facilityLabel: string | null;
  dressingRoomLabel: string | null;
  updatedAtLabel: string;
  wochenplanerHref: string;
};

export default function TrainingRecordContextRail({
  status,
  teamLabel,
  scheduleSummary,
  facilityLabel,
  dressingRoomLabel,
  updatedAtLabel,
  wochenplanerHref,
}: Props) {
  return (
    <div
      className="space-y-4 rounded-xl border border-[var(--sce-surface-border)] bg-[var(--sce-surface-standard)] p-4 text-sm shadow-[var(--sce-surface-shadow)]"
      data-testid="training-record-context-rail"
    >
      <div className="space-y-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Status</p>
        <TrainingRecordStatusBadge status={status} />
      </div>

      <div className="space-y-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Mannschaft</p>
        <p className="font-medium text-[var(--foreground)]">{teamLabel}</p>
      </div>

      {scheduleSummary ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            Trainingszeiten
          </p>
          <p className="text-[var(--text-2)]">{scheduleSummary}</p>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Anlage</p>
        <p className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
          <ProductDomainSceIcon name="facility" size={12} className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" />
          {facilityLabel ?? "Nicht zugewiesen"}
        </p>
        {dressingRoomLabel ? (
          <p className="text-xs text-[var(--muted)]">Garderobe · {dressingRoomLabel}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
          Letzte Änderung
        </p>
        <p className="text-xs text-[var(--text-2)]">{updatedAtLabel}</p>
      </div>

      <Link
        href={wochenplanerHref}
        className="fca-button-secondary inline-flex w-full items-center justify-center gap-1.5 text-xs"
        data-testid="training-record-rail-wochenplaner"
      >
        <ProductDomainSceIcon name="season" size={12} className="h-3.5 w-3.5" />
        Im Wochenplaner anzeigen
      </Link>
    </div>
  );
}
