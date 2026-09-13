"use client";

import { useState } from "react";
import NativeBillingCreateBankAccountForm from "@/components/admin/billing/NativeBillingCreateBankAccountForm";

type LegalEntityOption = { key: string; label: string };

type Props = {
  legalEntities: LegalEntityOption[];
};

export default function NativeBillingCreateBankAccountDialog({ legalEntities }: Props) {
  const [open, setOpen] = useState(false);

  if (legalEntities.length === 0) {
    return null;
  }

  return (
    <>
      <button type="button" className="fca-button-secondary" onClick={() => setOpen(true)}>
        Bankkonto hinzufügen
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bank-account-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Dialog schliessen"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--card)] p-6 shadow-xl ring-1 ring-[color-mix(in_srgb,var(--border)_60%,transparent)]">
            <h2 id="bank-account-dialog-title" className="text-lg font-semibold">
              Bankkonto hinzufügen
            </h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              CHF-Konto mit Referenzstrategie (QRR/SCOR/NON). Vollständige IBAN-Werte werden
              verschlüsselt gespeichert.
            </p>
            <div className="mt-5">
              <NativeBillingCreateBankAccountForm
                legalEntities={legalEntities}
                embedded
                onSuccess={() => setOpen(false)}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="fca-button-secondary"
                onClick={() => setOpen(false)}
              >
                Schliessen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
