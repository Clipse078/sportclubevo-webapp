import Link from "next/link";
import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import type { BillingReconciliationHealthSummary } from "@/lib/billing/operations/billing-operations-types";

type Props = {
  summary: BillingReconciliationHealthSummary;
};

export default function BillingOperationsReconciliationSummary({ summary }: Props) {
  const hasIssues =
    summary.unmatchedTransactionCount > 0 || summary.reviewRequiredTransactionCount > 0;

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Nicht zugeordnet</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {summary.unmatchedTransactionCount}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Prüfung erforderlich</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {summary.reviewRequiredTransactionCount}
          </dd>
        </div>
      </dl>
      {summary.latestImportFilename ? (
        <p className="text-sm text-muted-foreground">
          Letzter Import: {summary.latestImportFilename}
          {summary.latestImportUploadedAt
            ? ` · ${formatBillingDateDisplay(summary.latestImportUploadedAt.slice(0, 10))}`
            : null}
          {summary.latestImportStatus ? ` · ${summary.latestImportStatus}` : null}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Noch kein camt.054 Import.</p>
      )}
      <Link
        href={summary.reconciliationHref}
        className={`inline-flex text-sm font-medium hover:underline ${
          hasIssues ? "text-[var(--sce-primary)]" : "text-primary"
        }`}
      >
        Bankabgleich öffnen →
      </Link>
    </div>
  );
}
