"use client";

import type { ReactNode } from "react";
import type { ActivityCollaborationDomain } from "@/lib/collaboration/activity-change/types";
import {
  ActivityChangeCollaborationProvider,
  useActivityChangeCollaboration,
} from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { ContextualActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualActivityChangeImpactSurface";
import { ToastProvider } from "@/components/ui/ToastProvider";

function ImpactSlot({
  domain,
  activityId,
}: {
  domain: ActivityCollaborationDomain;
  activityId: string;
}) {
  const { impact, dismissImpact } = useActivityChangeCollaboration();
  if (!impact) return null;
  return (
    <ContextualActivityChangeImpactSurface
      domain={domain}
      activityId={activityId}
      impact={impact}
      onDismiss={dismissImpact}
    />
  );
}

export function EventActivityCollaborationHost({
  domain,
  activityId,
  children,
}: {
  domain: Extract<ActivityCollaborationDomain, "MATCH" | "TOURNAMENT">;
  activityId: string;
  children: ReactNode;
}) {
  return (
    <ToastProvider>
      <ActivityChangeCollaborationProvider>
        <div className="space-y-3">
          <ImpactSlot domain={domain} activityId={activityId} />
          {children}
        </div>
      </ActivityChangeCollaborationProvider>
    </ToastProvider>
  );
}
