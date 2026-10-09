import type { ReactNode } from "react";
import { EventActivityCollaborationHost } from "@/components/admin/collaboration/EventActivityCollaborationHost";

type Props = {
  children: ReactNode;
  params: Promise<{ matchId: string }>;
};

/**
 * Activity-scoped collaboration host survives page-level RSC refresh/revalidation
 * for the same match (SCE-COLLAB-01B-R3).
 */
export default async function MatchActivityCollaborationLayout({
  children,
  params,
}: Props) {
  const { matchId } = await params;

  return (
    <EventActivityCollaborationHost domain="MATCH" activityId={matchId}>
      {children}
    </EventActivityCollaborationHost>
  );
}
