"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import TenantCreateComposerDialog from "@/components/admin/tenants/TenantCreateComposerDialog";

type Props = {
  className?: string;
};

export default function TenantCreateTrigger({ className }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neuer Tenant
      </button>
      <TenantCreateComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          router.push("/dashboard/admin/tenants");
          router.refresh();
        }}
      />
    </>
  );
}
