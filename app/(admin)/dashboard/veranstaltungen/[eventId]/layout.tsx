import type { ReactNode } from "react";
import { EventActivityCollaborationHost } from "@/components/admin/collaboration/EventActivityCollaborationHost";

type Props = {
  children: ReactNode;
  params: Promise<{ eventId: string }>;
};

/**
 * Activity-scoped collaboration host survives page-level RSC refresh for club events (SCE-COLLAB-01C).
 */
export default async function VeranstaltungCollaborationLayout({
  children,
  params,
}: Props) {
  const { eventId } = await params;

  return (
    <EventActivityCollaborationHost domain="CLUB_EVENT" activityId={eventId} suppressImpactSlot>
      {children}
    </EventActivityCollaborationHost>
  );
}
