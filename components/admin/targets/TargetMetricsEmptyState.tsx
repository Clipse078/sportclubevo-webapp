import Link from "next/link";
import { Plus } from "lucide-react";
import { CD_TARGET_COPY } from "@/lib/club-development/product-copy";

type TargetMetricsEmptyStateProps = {
  targetId: string;
  canManage: boolean;
};

export default function TargetMetricsEmptyState({
  targetId,
  canManage,
}: TargetMetricsEmptyStateProps) {
  return (
    <div
      className="rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-6 text-center"
      data-testid="target-metrics-empty"
    >
      <p className="text-sm text-[var(--text-2)]">{CD_TARGET_COPY.noMetricsYet}</p>
      {canManage ? (
        <Link
          href={`/vereinsleitung/targets/${targetId}/edit#kennzahlen`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium text-[#0b4aa2] hover:bg-[var(--surface-2)]"
          data-testid="target-add-metric-action"
        >
          <Plus className="h-3.5 w-3.5" />
          Kennzahl hinzufügen
        </Link>
      ) : (
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          Kennzahlen können im Bearbeitungsmodus mit entsprechender Berechtigung erfasst werden.
        </p>
      )}
    </div>
  );
}