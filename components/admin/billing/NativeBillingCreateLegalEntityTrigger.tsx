"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NativeBillingCreateComposerDialog from "@/components/admin/billing/NativeBillingCreateComposerDialog";
import NativeBillingCreateLegalEntityForm from "@/components/admin/billing/NativeBillingCreateLegalEntityForm";

type Props = {
  className?: string;
};

export default function NativeBillingCreateLegalEntityTrigger({ className }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-secondary"}
        data-sce-create-flow="modal"
        onClick={() => setOpen(true)}
      >
        Rechtsträger hinzufügen
      </button>
      <NativeBillingCreateComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Rechtsträger hinzufügen"
        description="Abrechnungs-Rechtsträger für native SCE-Rechnungen."
      >
        <NativeBillingCreateLegalEntityForm
          onCreated={(key) => {
            setOpen(false);
            router.push(
              `/dashboard/admin/commercial/billing/settings/legal-entities/${key}`,
            );
            router.refresh();
          }}
        />
      </NativeBillingCreateComposerDialog>
    </>
  );
}
