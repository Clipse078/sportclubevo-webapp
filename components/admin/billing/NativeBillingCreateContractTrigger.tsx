"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NativeBillingCreateComposerDialog from "@/components/admin/billing/NativeBillingCreateComposerDialog";
import NativeBillingCreateContractForm from "@/components/admin/billing/NativeBillingCreateContractForm";

type Props = {
  products: { id: string; name: string; catalogueMonthlyNetMinor: number | null }[];
  customers: { id: string; label: string }[];
  legalEntities: { id: string; label: string }[];
  className?: string;
};

export default function NativeBillingCreateContractTrigger({
  products,
  customers,
  legalEntities,
  className,
}: Props) {
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
        Neuer Vertrag
      </button>
      <NativeBillingCreateComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Neuer Vertrag"
        description="SCE-Vertrag mit Produkt und Kunde anlegen."
      >
        <NativeBillingCreateContractForm
          products={products}
          customers={customers}
          legalEntities={legalEntities}
          onCreated={(key) => {
            setOpen(false);
            router.push(`/dashboard/admin/commercial/billing/contracts/${key}`);
            router.refresh();
          }}
        />
      </NativeBillingCreateComposerDialog>
    </>
  );
}
