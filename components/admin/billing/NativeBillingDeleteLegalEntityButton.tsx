"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { LegalEntityDependencyCounts } from "@/lib/billing/native-billing-types";

type NativeBillingDeleteLegalEntityButtonProps = {
  entityKey: string;
  displayName: string;
  legalName: string;
};

const DEPENDENCY_LABELS: Record<keyof LegalEntityDependencyCounts, string> = {
  billingBankAccounts: "Bankkonten",
  billingContracts: "Verträge",
  invoices: "Rechnungen",
  invoiceSequences: "Rechnungsnummern-Sequenzen",
};

function formatDependencySummary(dependencies: LegalEntityDependencyCounts): string[] {
  return (Object.entries(dependencies) as [keyof LegalEntityDependencyCounts, number][])
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${DEPENDENCY_LABELS[key]}: ${count}`);
}

export default function NativeBillingDeleteLegalEntityButton({
  entityKey,
  displayName,
  legalName,
}: NativeBillingDeleteLegalEntityButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dependencyHint, setDependencyHint] = useState<string[] | null>(null);

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);
    setDependencyHint(null);

    try {
      const response = await fetch(`/api/platform/billing/legal-entities/${encodeURIComponent(entityKey)}`, {
        method: "DELETE",
      });

      if (response.status === 204) {
        setOpen(false);
        router.push("/dashboard/admin/commercial/billing/settings");
        router.refresh();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        dependencies?: LegalEntityDependencyCounts;
      };

      if (response.status === 409 && data.dependencies) {
        setDependencyHint(formatDependencySummary(data.dependencies));
      }

      setError(
        data.error ??
          (response.status === 404
            ? "Rechtsträger nicht gefunden."
            : "Rechtsträger konnte nicht gelöscht werden."),
      );
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setDeleting(false);
    }
  }

  const identityLabel =
    displayName.trim() === legalName.trim()
      ? displayName
      : `${displayName} (${legalName})`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setDependencyHint(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-transparent px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Rechtsträger löschen
      </button>

      <Dialog
        open={open}
        onClose={() => !deleting && setOpen(false)}
        title="Rechtsträger wirklich löschen?"
        description="Diese Aktion kann nicht rückgängig gemacht werden."
        footer={
          <div className="flex w-full flex-col gap-2">
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {dependencyHint?.length ? (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {dependencyHint.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={deleting}>
                Abbrechen
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} loading={deleting}>
                Rechtsträger löschen
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
                Der Rechtsträger <span className="font-semibold">{identityLabel}</span> wird
                dauerhaft entfernt.
              </p>
            </div>
          </div>
          <p>
            Löschen ist nur möglich, wenn keine Abrechnungsdaten (Bankkonten, Verträge, Rechnungen
            oder Nummernkreise) mit diesem Rechtsträger verknüpft sind.
          </p>
        </div>
      </Dialog>
    </>
  );
}
