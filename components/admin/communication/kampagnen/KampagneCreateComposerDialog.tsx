"use client";

import { Dialog } from "@/components/ui/Dialog";
import CampaignComposer from "@/components/admin/communication/campaign/CampaignComposer";

export type KampagneComposerBootstrap = {
  tenantId: string;
  tenantTimezone: string;
  targetGroups: { id: string; name: string; status: string }[];
  sponsorOrganisations: {
    id: string;
    name: string;
    contacts: { id: string; displayName: string; isPrimary: boolean }[];
  }[];
  templateOptions: { id: string; name: string }[];
  canManageTemplates: boolean;
  initialAudienceMode: "WHOLE_ORG" | "SPONSORS";
  initialSponsorMode: "ALL_ACTIVE" | "SELECTED";
  initialSponsorOrganisationIds: string[];
  initialSponsorContactIds: string[];
};

type Props = KampagneComposerBootstrap & {
  open: boolean;
  onClose: () => void;
};

export default function KampagneCreateComposerDialog({ open, onClose, ...bootstrap }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Kampagne"
      description="Kampagnen-Composer im Workspace — Empfänger werden bei Veröffentlichung aufgelöst."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CampaignComposer {...bootstrap} />
      </div>
    </Dialog>
  );
}
