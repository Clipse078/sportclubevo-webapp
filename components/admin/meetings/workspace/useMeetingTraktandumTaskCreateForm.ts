"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition, type FormEventHandler } from "react";
import type { TaskContextType } from "@prisma/client";
import { createTraktandumAufgabeAction } from "@/app/(admin)/vereinsleitung/meetings/traktandum-aufgabe-actions";
import {
  ensureTraktandumAufgabeClientRequestId,
  patchTraktandumOutcomeDraft,
  resetTraktandumAufgabeClientRequestId,
} from "@/lib/meetings/sitzungsmodus/meeting-traktandum-outcome-draft";
import {
  runTraktandumAufgabeSubmit,
  traktandumAufgabeSubmitKey,
} from "@/lib/meetings/meeting-traktandum-aufgabe-submit";

export type UseMeetingTraktandumTaskCreateFormOptions = {
  meetingId: string;
  agendaItemId: string;
  contextType: TaskContextType;
  contextId: string;
  onCreated?: () => void;
  initialTitle?: string;
};

export function useMeetingTraktandumTaskCreateForm({
  meetingId,
  agendaItemId,
  contextType,
  contextId,
  onCreated,
  initialTitle = "",
}: UseMeetingTraktandumTaskCreateFormOptions) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [pending, startTransition] = useTransition();
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [fieldsKey, setFieldsKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const clearDraft = useCallback(() => {
    setTitle("");
    setAssigneeUserIds([]);
    setError(null);
    formRef.current?.reset();
    setFieldsKey((key) => key + 1);
    resetTraktandumAufgabeClientRequestId(meetingId, agendaItemId);
  }, [meetingId, agendaItemId]);

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      setError(null);
      const formData = new FormData(event.currentTarget);
      const visibility = formData.get("visibilityScope");
      const orgGrants = formData.get("orgUnitGrantIds");
      if (visibility === "ORG_UNIT" && !(typeof orgGrants === "string" && orgGrants.trim())) {
        setError("Bitte mindestens eine Organisationseinheit wählen.");
        return;
      }
      formData.set("assigneeUserIds", assigneeUserIds.join(","));

      const clientRequestId = ensureTraktandumAufgabeClientRequestId(meetingId, agendaItemId);
      const submitKey = traktandumAufgabeSubmitKey(meetingId, agendaItemId, clientRequestId);

      startTransition(() => {
        void runTraktandumAufgabeSubmit(submitKey, async () => {
          const result = await createTraktandumAufgabeAction({
            meetingId,
            agendaItemId,
            contextType,
            contextId,
            clientRequestId,
            formData,
          });
          if (!result.ok || !result.taskId) {
            const message = !result.ok ? result.message : "Aufgabe konnte nicht erstellt werden.";
            setError(message);
            throw new Error(message);
          }
          patchTraktandumOutcomeDraft(meetingId, agendaItemId, {
            aufgabeLastTaskId: result.taskId,
          });
          clearDraft();
          onCreated?.();
          router.refresh();
          return { taskId: result.taskId, deduplicated: result.deduplicated };
        }).catch(() => undefined);
      });
    },
    [agendaItemId, assigneeUserIds, clearDraft, contextId, contextType, meetingId, onCreated, router],
  );

  return {
    error,
    title,
    setTitle,
    pending,
    assigneeUserIds,
    setAssigneeUserIds,
    formRef,
    onSubmit,
    clearDraft,
    fieldsKey,
  };
}