import type { ReactNode } from "react";
import { EventActivityCollaborationHost } from "@/components/admin/collaboration/EventActivityCollaborationHost";

type Props = {
  children: ReactNode;
  params: Promise<{ tournamentId: string }>;
};

/**
 * Activity-scoped collaboration host survives page-level RSC refresh/revalidation
 * for the same tournament (SCE-COLLAB-01B-R3).
 */
export default async function TournamentActivityCollaborationLayout({
  children,
  params,
}: Props) {
  const { tournamentId } = await params;

  return (
    <EventActivityCollaborationHost domain="TOURNAMENT" activityId={tournamentId}>
      {children}
    </EventActivityCollaborationHost>
  );
}
