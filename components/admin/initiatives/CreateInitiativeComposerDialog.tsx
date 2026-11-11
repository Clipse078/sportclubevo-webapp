"use client";

import { useRouter } from "next/navigation";
import InitiativeForm from "@/components/admin/initiatives/InitiativeForm";
import { SceClubDevelopmentComposerShell } from "@/components/sce/club-development/SceClubDevelopmentComposerShell";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";

type Props = { open: boolean; onClose: () => void };

export default function CreateInitiativeComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <SceClubDevelopmentComposerShell
      open={open}
      onClose={onClose}
      title="Neue Initiative"
      description="Initiative im Workspace erfassen — ohne die Übersicht zu verlassen."
      testId="create-initiative-composer"
    >
      <ClubDevelopmentComposerCancelBridge onClose={onClose}>
        {(onCancel) => (
          <InitiativeForm
            mode="create"
            layout="composer"
            onCancel={onCancel}
            onSuccess={(slug) => {
              onClose();
              router.push(slug ? `/vereinsleitung/initiativen/${slug}` : "/vereinsleitung/initiativen?status=saved");
              router.refresh();
            }}
          />
        )}
      </ClubDevelopmentComposerCancelBridge>
    </SceClubDevelopmentComposerShell>
  );
}
