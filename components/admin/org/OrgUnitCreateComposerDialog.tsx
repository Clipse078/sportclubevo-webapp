"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import OrgUnitForm from "@/components/admin/org/OrgUnitForm";
import { useOrgBuilderHistory } from "@/components/admin/org/OrgUnitBuilderHistoryContext";

type ParentOption = { id: string; key: string; name: string; level: number; type: string };

type Props = {
  open: boolean;
  onClose: () => void;
  parentOptions: ParentOption[];
  defaultParentId?: string;
  onCreatedInBuilder?: () => void;
};

export default function OrgUnitCreateComposerDialog({
  open,
  onClose,
  parentOptions,
  defaultParentId,
  onCreatedInBuilder,
}: Props) {
  const router = useRouter();
  const orgHistory = useOrgBuilderHistory();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Organisationseinheit"
      description="Einheit im Organigramm anlegen — übergeordnete Einheit ist vorausgefüllt, wenn aus dem Organigramm gewählt."
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <OrgUnitForm
          mode="create"
          layout="composer"
          parentOptions={parentOptions}
          defaultValues={{ parentId: defaultParentId ?? "" }}
          onCancel={onClose}
          onSuccess={(orgUnitId, meta) => {
            onClose();
            const payload = meta?.createPayload;
            if (onCreatedInBuilder && orgUnitId && payload) {
              orgHistory.pushCreate({
                unitName: payload.name,
                payload,
                createdId: orgUnitId,
                onRefresh: () => onCreatedInBuilder(),
              });
              onCreatedInBuilder();
              return;
            }
            router.push(orgUnitId ? `/dashboard/org-units/${orgUnitId}` : "/dashboard/org-units");
            router.refresh();
          }}
        />
      </div>
    </Dialog>
  );
}
