"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { SceTextInput } from "@/components/sce/forms/SceTextInput";
import type { FinanceCommitmentDetailRecord } from "@/lib/finance/services/finance-commitment-query-service";
import { linkSupplierBillExternalReferenceAction } from "@/app/(admin)/dashboard/finance/commitments/actions";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export type FinanceCommitmentSupplierBillEvidenceSectionProps = {
  detail: FinanceCommitmentDetailRecord;
  financeYearId: string;
  t: TranslateFn;
  formatCalendarDate: (iso: string) => string;
  onEvidenceChanged: () => void;
};

export function FinanceCommitmentSupplierBillEvidenceSection({
  detail,
  financeYearId,
  t,
  formatCalendarDate,
  onEvidenceChanged,
}: FinanceCommitmentSupplierBillEvidenceSectionProps) {
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = detail.supplierBillEvidenceLinks ?? [];

  function handleLink() {
    const trimmed = reference.trim();
    if (!trimmed) {
      setError(t("supplierBillRefRequired"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await linkSupplierBillExternalReferenceAction({
        commitmentId: detail.id,
        financeYearId,
        externalReference: trimmed,
      });
      if (!result.ok) {
        setError(result.errorKey ? t(result.errorKey) : result.error);
        return;
      }
      setReference("");
      onEvidenceChanged();
    });
  }

  return (
    <section
      className="min-w-0 space-y-3 border-t border-[var(--sce-surface-border-subtle)]/80 pt-4"
      data-finance-commitment-supplier-bill-evidence
    >
      <header className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("supplierBillSectionTitle")}
        </h3>
        <p className="text-xs text-[var(--muted)]">{t("supplierBillSectionHint")}</p>
      </header>

      {rows.length > 0 ? (
        <ul className="min-w-0 space-y-2 text-sm" data-finance-supplier-bill-link-list>
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-md border border-[var(--sce-surface-border-subtle)]/80 px-3 py-2"
            >
              <p className="font-medium text-[var(--foreground)] break-all">{row.externalReference}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t("supplierBillLinkMeta", {
                  date: formatCalendarDate(row.linkedAtIso.slice(0, 10)),
                  name: row.linkedByDisplayName ?? t("supplierBillLinkMetaUnknownActor"),
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">{t("supplierBillEmpty")}</p>
      )}

      {detail.canLinkSupplierBillEvidence ? (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
          <SceFormField label={t("supplierBillRefLabel")} className="min-w-0 flex-1">
            <SceTextInput
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t("supplierBillRefPlaceholder")}
              disabled={pending}
              data-finance-supplier-bill-ref-input
            />
          </SceFormField>
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-full shrink-0 sm:w-auto"
            disabled={pending}
            onClick={handleLink}
            data-finance-supplier-bill-link-action
          >
            {t("supplierBillLinkAction")}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
