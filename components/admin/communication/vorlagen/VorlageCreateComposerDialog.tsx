"use client";

import { Dialog } from "@/components/ui/Dialog";
import VorlageManagementForm from "@/components/admin/communication/vorlagen/VorlageManagementForm";

type TargetGroupOption = { id: string; name: string; status: string };
type SponsorOrgOption = {
  id: string;
  name: string;
  contacts: { id: string; firstName: string; lastName: string; isPrimary: boolean }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  targetGroups: TargetGroupOption[];
  sponsorOrganisations: SponsorOrgOption[];
};

export default function VorlageCreateComposerDialog({
  open,
  onClose,
  tenantId,
  targetGroups,
  sponsorOrganisations,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Vorlage"
      description="Vorlage im Composer anlegen. Fallback: /dashboard/communication/vorlagen/new"
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <VorlageManagementForm
          mode="create"
          tenantId={tenantId}
          canManage
          targetGroups={targetGroups}
          sponsorOrganisations={sponsorOrganisations}
        />
      </div>
    </Dialog>
  );
}
