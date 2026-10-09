"use client";

import type { ReactNode } from "react";
import { ActivityChangeCollaborationProvider, useActivityChangeCollaboration } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { ContextualActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualActivityChangeImpactSurface";

function ImpactSlot({ sessionId }: { sessionId: string }) {
  const { impact, dismissImpact } = useActivityChangeCollaboration();
  if (!impact) return null;
  return (
    <ContextualActivityChangeImpactSurface
      domain="TRAINING"
      activityId={sessionId}
      impact={impact}
      onDismiss={dismissImpact}
    />
  );
}

export function TrainingSessionCollaborationHost({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  return (
    <ActivityChangeCollaborationProvider>
      <div className="space-y-3">
        <ImpactSlot sessionId={sessionId} />
        {children}
      </div>
    </ActivityChangeCollaborationProvider>
  );
}
