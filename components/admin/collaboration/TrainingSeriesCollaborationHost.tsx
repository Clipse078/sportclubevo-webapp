"use client";

import type { ReactNode } from "react";
import {
  ActivityChangeCollaborationProvider,
  useActivityChangeCollaboration,
} from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { ContextualMultiActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualMultiActivityChangeImpactSurface";
import { ToastProvider } from "@/components/ui/ToastProvider";

function MultiImpactSlot({ trainingSeriesId }: { trainingSeriesId: string }) {
  const { multiImpact, dismissMultiImpact } = useActivityChangeCollaboration();
  if (!multiImpact) return null;
  return (
    <ContextualMultiActivityChangeImpactSurface
      trainingSeriesId={trainingSeriesId}
      impact={multiImpact}
      onDismiss={dismissMultiImpact}
    />
  );
}

export function TrainingSeriesCollaborationHost({
  trainingSeriesId,
  children,
}: {
  trainingSeriesId: string;
  children: ReactNode;
}) {
  return (
    <ToastProvider>
      <ActivityChangeCollaborationProvider>
        <div className="space-y-3">
          <MultiImpactSlot trainingSeriesId={trainingSeriesId} />
          {children}
        </div>
      </ActivityChangeCollaborationProvider>
    </ToastProvider>
  );
}
