"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition, type FormEventHandler } from "react";
import type { TaskContextType } from "@prisma/client";
import { createContextualAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";

export type ContextualTaskCreateSuccessMode = "refresh" | "navigate";

export type UseContextualTaskCreateFormOptions = {
  contextType: TaskContextType;
  contextId: string;
  successMode?: ContextualTaskCreateSuccessMode;
  onCreated?: () => void;
  initialTitle?: string;
};

export function useContextualTaskCreateForm({
  contextType,
  contextId,
  successMode = "refresh",
  onCreated,
  initialTitle = "",
}: UseContextualTaskCreateFormOptions) {
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
  }, []);

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
      startTransition(async () => {
        const result = await createContextualAufgabeAction(contextType, contextId, formData);
        if (result.ok && result.taskId) {
          clearDraft();
          onCreated?.();
          if (successMode === "navigate") {
            router.push(taskWorkspaceHref(result.taskId));
          }
          router.refresh();
          return;
        }
        if (!result.ok) {
          setError(result.message);
        }
      });
    },
    [assigneeUserIds, clearDraft, contextId, contextType, onCreated, router, successMode],
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
