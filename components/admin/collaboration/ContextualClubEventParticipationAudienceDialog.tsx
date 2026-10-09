"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import {
  ClubEventParticipationAudienceEditorCore,
  type ClubEventParticipationAudienceEditorCoreHandle,
} from "@/components/admin/veranstaltungen/ClubEventParticipationAudienceEditorCore";

type Props = {
  eventId: string;
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
};

export function ContextualClubEventParticipationAudienceDialog({
  eventId,
  open,
  onClose,
  disabled,
}: Props) {
  const t = useTranslations("Collaboration.activityChange");
  const editorRef = useRef<ClubEventParticipationAudienceEditorCoreHandle>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    setSaveError(null);
    onClose();
  }

  function handleSave() {
    setSaveError(null);
    startTransition(async () => {
      const editor = editorRef.current;
      if (!editor) {
        onClose();
        return;
      }
      if (!editor.hasPendingSelection()) {
        onClose();
        return;
      }
      const ok = await editor.savePendingSelection();
      if (ok) {
        onClose();
        return;
      }
      setSaveError("Teilnehmerkreis konnte nicht gespeichert werden.");
    });
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      title={t("configureAudience")}
      description={t("configureAudienceDescription")}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={handleCancel} disabled={pending}>
            {t("composerCancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={pending || disabled}
            data-testid="contextual-club-event-audience-save"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("configureAudienceSave")}
          </Button>
        </>
      }
    >
      <ClubEventParticipationAudienceEditorCore
        ref={editorRef}
        eventId={eventId}
        disabled={disabled}
        interaction="contextual"
      />
      {saveError ? (
        <p className="mt-2 text-xs text-rose-600" role="alert">
          {saveError}
        </p>
      ) : null}
    </Dialog>
  );
}
