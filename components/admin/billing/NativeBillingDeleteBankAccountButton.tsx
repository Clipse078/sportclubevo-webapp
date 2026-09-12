"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { BillingBankAccountDependencyCounts } from "@/lib/billing/native-billing-types";

type NativeBillingDeleteBankAccountButtonProps = {
  accountId: string;
  label: string;
  legalEntityLabel: string;
  referenceStrategy: string;
  ibanMasked: string;
  qrIbanMasked: string | null;
};

export default function NativeBillingDeleteBankAccountButton({
  accountId,
  label,
  legalEntityLabel,
  referenceStrategy,
  ibanMasked,
  qrIbanMasked,
}: NativeBillingDeleteBankAccountButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/platform/billing/bank-accounts/${encodeURIComponent(accountId)}`,
        { method: "DELETE" },
      );

      if (response.status === 204) {
        setOpen(false);
        setSuccess("Bankkonto wurde gelöscht.");
        router.refresh();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        dependencies?: BillingBankAccountDependencyCounts;
      };

      setError(
        data.error ??
          (response.status === 404
            ? "Bankkonto nicht gefunden."
            : "Bankkonto konnte nicht gelöscht werden."),
      );
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(null);
          setOpen(true);
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Bankkonto löschen
      </button>

      <Dialog
        open={open}
        onClose={() => !deleting && setOpen(false)}
        title="Dieses Bankkonto wirklich löschen?"
        description="Nur unbenutzte Bankkonten können gelöscht werden."
        footer={
          <div className="flex w-full flex-col gap-2">
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={deleting}>
                Abbrechen
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} loading={deleting}>
                Bankkonto löschen
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-[var(--text-2)]">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="font-medium text-red-800">
                Das Konto <span className="font-semibold">{label}</span> wird dauerhaft entfernt.
              </p>
            </div>
          </div>
          <dl className="space-y-1 text-muted-foreground">
            <div>
              <dt className="inline font-medium text-foreground">Rechtsträger: </dt>
              <dd className="inline">{legalEntityLabel}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Referenzstrategie: </dt>
              <dd className="inline">{referenceStrategy}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">IBAN: </dt>
              <dd className="inline">{ibanMasked}</dd>
            </div>
            {qrIbanMasked ? (
              <div>
                <dt className="inline font-medium text-foreground">QR-IBAN: </dt>
                <dd className="inline">{qrIbanMasked}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </Dialog>
    </>
  );
}
