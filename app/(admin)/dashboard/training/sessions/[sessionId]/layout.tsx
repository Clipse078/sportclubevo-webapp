import type { ReactNode } from "react";
import { TrainingSessionCollaborationHost } from "@/components/admin/collaboration/TrainingSessionCollaborationHost";

type Props = {
  children: ReactNode;
  params: Promise<{ sessionId: string }>;
};

/**
 * Activity-scoped collaboration host survives page-level RSC refresh/revalidation
 * for the same training session (SCE-COLLAB-01B-R3).
 */
export default async function TrainingSessionCollaborationLayout({
  children,
  params,
}: Props) {
  const { sessionId } = await params;

  return (
    <TrainingSessionCollaborationHost sessionId={sessionId}>{children}</TrainingSessionCollaborationHost>
  );
}
