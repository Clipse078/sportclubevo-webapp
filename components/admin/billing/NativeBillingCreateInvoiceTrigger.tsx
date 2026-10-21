"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NativeBillingCreateComposerDialog from "@/components/admin/billing/NativeBillingCreateComposerDialog";
import NativeBillingCreateInvoiceForm from "@/components/admin/billing/NativeBillingCreateInvoiceForm";

type ContractOption = {
  id: string;
  label: string;
  status: string;
};

type Props = {
  contracts: ContractOption[];
  className?: string;
};

export default function NativeBillingCreateInvoiceTrigger({ contracts, className }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary"}
        data-sce-create-flow="modal"
        onClick={() => setOpen(true)}
      >
        Rechnungsentwurf
      </button>
      <NativeBillingCreateComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Rechnungsentwurf"
        description="Entwurf aus aktivem Vertrag erzeugen."
      >
        <NativeBillingCreateInvoiceForm
          contracts={contracts}
          onCreated={(key) => {
            setOpen(false);
            router.push(`/dashboard/admin/commercial/billing/invoices/${key}`);
            router.refresh();
          }}
        />
      </NativeBillingCreateComposerDialog>
    </>
  );
}
