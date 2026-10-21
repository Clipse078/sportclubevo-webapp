"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NativeBillingCreateComposerDialog from "@/components/admin/billing/NativeBillingCreateComposerDialog";
import NativeBillingCreateCustomerForm, {
  type TenantOption,
} from "@/components/admin/billing/NativeBillingCreateCustomerForm";

type Props = {
  tenants: TenantOption[];
  className?: string;
};

export default function NativeBillingCreateCustomerTrigger({ tenants, className }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary"}
        data-sce-create-flow="modal"
        data-testid="billing-customer-create-trigger"
        onClick={() => setOpen(true)}
      >
        Neuer Kunde
      </button>
      <NativeBillingCreateComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Neuer Kunde"
        description="Nativen SCE Billing-Kunden anlegen. Fallback-Route: /customers/new"
      >
        <NativeBillingCreateCustomerForm
          tenants={tenants}
          onCreated={(customerKey) => {
            setOpen(false);
            router.push(`/dashboard/admin/commercial/billing/customers/${customerKey}`);
            router.refresh();
          }}
        />
      </NativeBillingCreateComposerDialog>
    </>
  );
}
