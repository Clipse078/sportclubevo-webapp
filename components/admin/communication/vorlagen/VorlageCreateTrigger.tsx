"use client";

import { useState } from "react";
import VorlageCreateComposerDialog from "@/components/admin/communication/vorlagen/VorlageCreateComposerDialog";

type TargetGroupOption = { id: string; name: string; status: string };
type SponsorOrgOption = {
  id: string;
  name: string;
  contacts: { id: string; firstName: string; lastName: string; isPrimary: boolean }[];
};

type Props = {
  tenantId: string;
  targetGroups: TargetGroupOption[];
  sponsorOrganisations: SponsorOrgOption[];
  className?: string;
  label?: string;
};

export default function VorlageCreateTrigger({
  tenantId,
  targetGroups,
  sponsorOrganisations,
  className,
  label = "Neue Vorlage",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={
          className ??
          "inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
        }
        data-sce-create-flow="modal"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <VorlageCreateComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        tenantId={tenantId}
        targetGroups={targetGroups}
        sponsorOrganisations={sponsorOrganisations}
      />
    </>
  );
}
