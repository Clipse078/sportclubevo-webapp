"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { PersonalActionInlineRequirement } from "@/lib/personal-actions/presentation";
import { acknowledgePersonalRequirementAction } from "@/app/(admin)/dashboard/aufgaben/personal-requirement-actions";
import TaskDescriptionContent from "./TaskDescriptionContent";
import { storedTaskDescriptionIsEmpty } from "@/lib/tasks/task-description";

type Props = {
  requirement: PersonalActionInlineRequirement;
};

export default function PersonalActionRequirementInline({ requirement }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasDescription = !storedTaskDescriptionIsEmpty(requirement.description);

  const submit = useCallback(() => {
    if (isPending) {
      return;
    }
    setErrorMessage(null);

    startTransition(async () => {
      const result = await acknowledgePersonalRequirementAction({
        personalActionId: requirement.personalActionId,
        requirementRecipientId: requirement.requirementRecipientId,
      });

      if (result.ok) {
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }, [isPending, requirement, router]);

  const subject = requirement.subjectDisplayName?.trim();
  const nameSuffix =
    requirement.actingForOtherPerson && subject ? ` für ${subject}` : "";

  return (
    <div
      className="mt-2 flex flex-col gap-1.5"
      data-testid="personal-action-inline-requirement"
      aria-busy={isPending || undefined}
    >
      {hasDescription ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="self-start text-[0.75rem] font-medium text-[var(--primary)] hover:underline"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            data-testid="personal-requirement-description-toggle"
          >
            {expanded ? "Beschreibung ausblenden" : "Beschreibung anzeigen"}
          </button>
          {expanded ? (
            <TaskDescriptionContent
              description={requirement.description}
              className="text-[0.8125rem] text-[var(--text-2)]"
              data-testid="personal-requirement-description"
            />
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className={cn(
            "inline-flex items-center rounded-md border px-2.5 py-1 text-[0.8125rem] font-medium transition-colors",
            "border-[var(--primary)]/40 bg-[var(--primary)]/5 text-[var(--foreground)]",
            "hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/10",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label={`Bestätigen${nameSuffix}`}
          data-testid="personal-requirement-acknowledge"
        >
          {isPending ? "Wird gespeichert…" : "Bestätigen"}
        </button>
      </div>
      {errorMessage ? (
        <p
          className="text-[0.75rem] text-[var(--destructive)]"
          role="alert"
          data-testid="personal-requirement-error"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
