"use client";

import { Dialog } from "@/components/ui/Dialog";
import ClubCommunicationComposer from "@/components/admin/communication/club/ClubCommunicationComposer";

export type MitteilungComposerBootstrap = {
  targetGroups: { id: string; name: string; status: string }[];
  templateOptions: { id: string; name: string; kind: string }[];
  tenantTimezone: string;
  tenantId: string;
};

type Props = MitteilungComposerBootstrap & {
  open: boolean;
  onClose: () => void;
};

export default function MitteilungCreateComposerDialog({
  open,
  onClose,
  targetGroups,
  templateOptions,
  tenantTimezone,
  tenantId,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Mitteilung"
      description="Inhalt, Empfänger und Kanäle — Workspace-Kontext bleibt erhalten."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ClubCommunicationComposer
          targetGroups={targetGroups}
          tenantTimezone={tenantTimezone}
          templateOptions={templateOptions}
          tenantId={tenantId}
        />
      </div>
    </Dialog>
  );
}
