"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import SceInlineDestructiveConfirm from "@/components/sce/club-development/SceInlineDestructiveConfirm";
import type { MeetingDeletionImpact } from "@/lib/meetings/meeting-delete-service";
import { buildMeetingDeletionConfirmDescription } from "@/lib/meetings/meeting-deletion-confirm-copy";
import { MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS } from "@/lib/meetings/meeting-workspace-secondary-menu-styles";

type MeetingDeleteMenuItemProps = {
  onSelect: () => void;
  disabled?: boolean;
};

export function MeetingDeleteMenuItem({ onSelect, disabled }: MeetingDeleteMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => onSelect()}
      className={MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS}
      data-testid="meeting-delete-trigger"
    >
      <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Sitzung löschen
    </button>
  );
}

type MeetingDeleteInlineConfirmProps = {
  meetingId: string;
  meetingTitle: string;
  impact: MeetingDeletionImpact | null;
  impactLoading: boolean;
  onCancel: () => void;
};

export function MeetingDeleteInlineConfirm({
  meetingId,
  meetingTitle,
  impact,
  impactLoading,
  onCancel,
}: MeetingDeleteInlineConfirmProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const description = buildMeetingDeletionConfirmDescription(meetingTitle, impact);

  function performDelete() {
    if (impactLoading || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/meetings/${encodeURIComponent(meetingId)}/permanent?confirm=true`,
          { method: "DELETE" },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(
            typeof data.error === "string" ? data.error : "Sitzung konnte nicht gelöscht werden.",
          );
          return;
        }
        router.push("/vereinsleitung/meetings?status=deleted");
        router.refresh();
      } catch {
        setError("Netzwerkfehler. Bitte erneut versuchen.");
      }
    });
  }

  return (
    <SceInlineDestructiveConfirm
      title="Sitzung endgültig löschen?"
      description={impactLoading ? "Auswirkungen werden geprüft…" : description}
      confirmLabel="Sitzung endgültig löschen"
      pending={pending || impactLoading}
      error={error}
      onConfirm={performDelete}
      onCancel={() => {
        if (!pending) onCancel();
      }}
      testId="meeting-delete-confirm"
    />
  );
}

export async function fetchMeetingDeletionImpact(meetingId: string): Promise<MeetingDeletionImpact> {
  const response = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/permanent`, {
    method: "DELETE",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Vorschau nicht verfügbar.");
  }
  return data?.impact ?? {
    agendaItems: 0,
    decisions: 0,
    actions: 0,
    participants: 0,
  };
}