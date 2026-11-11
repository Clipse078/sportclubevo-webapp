"use client";

import { useRouter } from "next/navigation";
import MeetingForm from "@/components/admin/meetings/MeetingForm";
import { SceClubDevelopmentComposerShell } from "@/components/sce/club-development/SceClubDevelopmentComposerShell";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";

type Props = { open: boolean; onClose: () => void };

export default function CreateMeetingComposerDialog({ open, onClose }: Props) {
  const router = useRouter();

  return (
    <SceClubDevelopmentComposerShell
      open={open}
      onClose={onClose}
      title="Neues Meeting"
      description="Meeting im Vereinsleitung-Workspace erfassen — Kontext bleibt erhalten."
      testId="create-meeting-composer"
    >
      <ClubDevelopmentComposerCancelBridge onClose={onClose}>
        {(onCancel) => (
          <MeetingForm
            mode="create"
            layout="composer"
            onCancel={onCancel}
            onSuccess={(slug) => {
              onClose();
              router.push(slug ? `/vereinsleitung/meetings/${slug}` : "/vereinsleitung/meetings?status=saved");
              router.refresh();
            }}
          />
        )}
      </ClubDevelopmentComposerCancelBridge>
    </SceClubDevelopmentComposerShell>
  );
}
