import Link from "next/link";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import type { BillingReconciliationHealthSummary } from "@/lib/billing/operations/billing-operations-types";

type Props = {
  summary: BillingReconciliationHealthSummary;
};

export default function BillingOperationsReconciliationSummary({ summary }: Props) {
  const hasIssues =
    summary.unmatchedTransactionCount > 0 || summary.reviewRequiredTransactionCount > 0;

  return (
    <BillingPanel
      title="Swiss QR / camt.054"
      description={
        hasIssues
          ? "Es gibt offene Zuordnungen oder Transaktionen zur Prüfung."
          : "Import und Zuordnung sind ohne kritische offene Punkte."
      }
    >
      <dl className="grid gap-4 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[var(--muted)]">Nicht zugeordnet</dt>
          <dd className="text-lg font-semibold tabular-nums">{summary.unmatchedTransactionCount}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[var(--muted)]">Prüfung erforderlich</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {summary.reviewRequiredTransactionCount}
          </dd>
        </div>
      </dl>
      {summary.latestImportUploadedAt ? (
        <p className="mt-4 text-xs text-[var(--text-2)]">
          Letzter Import{" "}
          {formatBillingDateDisplay(summary.latestImportUploadedAt.slice(0, 10))}
          {summary.latestImportStatus ? ` · ${summary.latestImportStatus}` : null}
        </p>
      ) : (
        <p className="mt-4 text-xs text-[var(--text-2)]">Noch kein camt.054-Import vorhanden.</p>
      )}
      <Link
        href={summary.reconciliationHref}
        className="fca-button-secondary mt-5 inline-flex w-full justify-center text-sm sm:w-auto"
      >
        Bankabgleich öffnen
      </Link>
    </BillingPanel>
  );
}
