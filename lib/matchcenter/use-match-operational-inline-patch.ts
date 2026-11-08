"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export type MatchOperationalInlinePatchBody = {
  pitchCode?: string | null;
  homeDressingRoomCode?: string | null;
  awayDressingRoomCode?: string | null;
  infoboardVisible?: boolean;
};

type PatchField = keyof MatchOperationalInlinePatchBody;

export function useMatchOperationalInlinePatch(matchId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingFields, setPendingFields] = useState<ReadonlySet<PatchField>>(() => new Set());
  const inFlight = useRef(0);

  const patchField = useCallback(
    async (field: PatchField, value: MatchOperationalInlinePatchBody[PatchField]) => {
      inFlight.current += 1;
      setPendingFields((prev) => new Set(prev).add(field));

      try {
        const res = await fetch(`/api/matchcenter/${matchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;

        if (!res.ok) {
          throw new Error(data?.error ?? "Änderung konnte nicht gespeichert werden.");
        }

        router.refresh();
        return true;
      } catch (err) {
        toast.danger(
          err instanceof Error ? err.message : "Änderung konnte nicht gespeichert werden.",
          { duration: 6000 },
        );
        return false;
      } finally {
        inFlight.current -= 1;
        setPendingFields((prev) => {
          const next = new Set(prev);
          next.delete(field);
          return next;
        });
      }
    },
    [matchId, router, toast],
  );

  const isFieldPending = useCallback(
    (field: PatchField) => pendingFields.has(field),
    [pendingFields],
  );

  const isSaving = pendingFields.size > 0;

  return { patchField, isFieldPending, isSaving };
}
