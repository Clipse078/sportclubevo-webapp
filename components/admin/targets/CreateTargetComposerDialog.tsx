"use client";

import { useRouter } from "next/navigation";
import TargetNewPageClient from "@/components/admin/targets/TargetNewPageClient";
import { SceClubDevelopmentComposerShell } from "@/components/sce/club-development/SceClubDevelopmentComposerShell";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";

type Props = { open: boolean; onClose: () => void };

export default function CreateTargetComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <SceClubDevelopmentComposerShell
      open={open}
      onClose={onClose}
      title="Neues Ziel"
      description="Strategisches Ziel mit Metriken — Vorlagen optional im Composer."
      testId="create-target-composer"
    >
      <ClubDevelopmentComposerCancelBridge onClose={onClose}>
        {(onCancel) => (
          <TargetNewPageClient
            layout="composer"
            onCancel={onCancel}
            onSuccess={(id) => {
              onClose();
              router.push(
                id ? `/vereinsleitung/targets/${id}?status=saved` : "/vereinsleitung/targets?status=saved",
              );
              router.refresh();
            }}
          />
        )}
      </ClubDevelopmentComposerCancelBridge>
    </SceClubDevelopmentComposerShell>
  );
}
