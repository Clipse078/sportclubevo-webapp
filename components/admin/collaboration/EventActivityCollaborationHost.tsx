"use client";

import type { ReactNode } from "react";
import type { ActivityCollaborationDomain } from "@/lib/collaboration/activity-change/types";
import {
  ActivityChangeCollaborationProvider,
  useActivityChangeCollaboration,
} from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { ContextualActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualActivityChangeImpactSurface";
import { ToastProvider } from "@/components/ui/ToastProvider";

export function EventActivityCollaborationImpactSlot({
  domain,
  activityId,
}: {
  domain: Extract<ActivityCollaborationDomain, "MATCH" | "TOURNAMENT" | "CLUB_EVENT">;
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
  suppressImpactSlot = false,
}: {
  domain: Extract<ActivityCollaborationDomain, "MATCH" | "TOURNAMENT" | "CLUB_EVENT">;
  activityId: string;
  children: ReactNode;
  /** When true, render impact via {@link EventActivityCollaborationImpactSlot} in the page shell instead. */
  suppressImpactSlot?: boolean;
}) {
  return (
    <ToastProvider>
      <ActivityChangeCollaborationProvider>
        <div className="space-y-3">
          {suppressImpactSlot ? null : (
            <EventActivityCollaborationImpactSlot domain={domain} activityId={activityId} />
          )}
          {children}
        </div>
      </ActivityChangeCollaborationProvider>
    </ToastProvider>
  );
}
