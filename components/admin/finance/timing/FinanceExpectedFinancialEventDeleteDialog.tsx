"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import { deleteFinanceExpectedEventAction } from "@/app/(admin)/dashboard/finance/forecast/timing/actions";

type FinanceExpectedFinancialEventDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  financeYearId: string;
  event: ExpectedFinancialEventRecord | null;
};

export function FinanceExpectedFinancialEventDeleteDialog({
  open,
  onClose,
  onDeleted,
  financeYearId,
  event,
}: FinanceExpectedFinancialEventDeleteDialogProps) {
  const t = useTranslations("Finance.forecast.timing.deleteDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!event) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteFinanceExpectedEventAction({
        eventId: event.id,
        financeYearId,
        expectedUpdatedAt: event.updatedAt,
      });
      if (!result.ok) {
        if (result.errorCode === "FINANCE_EXPECTED_EVENT_STALE") {
          onDeleted();
          onClose();
          return;
        }
        setError(result.error);
        return;
      }
      onDeleted();
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={t("title")}>
      <div className="space-y-3 px-5 py-3 text-sm text-[var(--text-2)]">
        <p>{t("description")}</p>
        <p className="text-xs">{t("forecastUnchanged")}</p>
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          {t("cancel")}
        </Button>
        <Button type="button" variant="danger" onClick={handleDelete} disabled={pending || !event}>
          {pending ? t("deleting") : t("confirm")}
        </Button>
      </div>
    </Dialog>
  );
}
