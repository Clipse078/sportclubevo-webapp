"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import type { FacilityResourceType } from "@prisma/client";

type PatchKind = "pitch" | "dressing";

export function useWeekplannerTrainingAllocationInlinePatch(trainingSessionId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingKinds, setPendingKinds] = useState<ReadonlySet<PatchKind>>(() => new Set());
  const inFlight = useRef(0);

  const replaceAllocationGroup = useCallback(
    async (kind: PatchKind, nextResourceIds: string[]): Promise<boolean> => {
      inFlight.current += 1;
      setPendingKinds((prev) => new Set(prev).add(kind));

      const targetGroup = kind === "pitch" ? "PITCH_HALL" : "DRESSING_ROOM";

      try {
        const currentAllocationsRes = await fetch(`/api/training-sessions/${trainingSessionId}/allocations`);
        const currentData = (await currentAllocationsRes.json().catch(() => null)) as
          | { allocations?: Array<{ id: string; facilityResourceType: string; facilityResourceId: string }> }
          | null;
        const currentAllocations = currentData?.allocations ?? [];

        const groupAllocations = currentAllocations.filter(
          (a) => classifyFacilityResourceType(a.facilityResourceType as FacilityResourceType) === targetGroup,
        );

        await Promise.all(
          groupAllocations.map((a) =>
            fetch(`/api/training-sessions/${trainingSessionId}/allocations/${a.id}`, { method: "DELETE" }),
          ),
        );

        for (const resourceId of nextResourceIds) {
          const res = await fetch(`/api/training-sessions/${trainingSessionId}/allocations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ facilityResourceId: resourceId }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(data?.error ?? "Zuweisung konnte nicht gespeichert werden.");
          }
        }

        router.refresh();
        return true;
      } catch (err) {
        toast.danger(err instanceof Error ? err.message : "Zuweisung konnte nicht gespeichert werden.", {
          duration: 6000,
        });
        return false;
      } finally {
        inFlight.current -= 1;
        setPendingKinds((prev) => {
          const next = new Set(prev);
          next.delete(kind);
          return next;
        });
      }
    },
    [router, toast, trainingSessionId],
  );

  const isKindPending = useCallback((kind: PatchKind) => pendingKinds.has(kind), [pendingKinds]);
  const isSaving = pendingKinds.size > 0;

  return { replaceAllocationGroup, isKindPending, isSaving };
}
