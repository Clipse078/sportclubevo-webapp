"use client";

import { ClubEventParticipationAudienceEditorCore } from "@/components/admin/veranstaltungen/ClubEventParticipationAudienceEditorCore";

type Props = {
  eventId: string;
  disabled?: boolean;
};

export default function ClubEventParticipationAudienceEditor({ eventId, disabled }: Props) {
  return (
    <div data-testid="club-event-participation-audience-editor">
      <ClubEventParticipationAudienceEditorCore
        eventId={eventId}
        disabled={disabled}
        interaction="inline"
      />
    </div>
  );
}
