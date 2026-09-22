"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PersonalRequirementExecutionView } from "@/lib/requirements/personal-execution-service";
import { REQUIREMENT_STATUS_LABELS } from "@/lib/requirements/presentation";
import RequirementRecipientStatusLabel from "./RequirementRecipientStatusLabel";
import TaskDescriptionContent from "./TaskDescriptionContent";
import { storedTaskDescriptionIsEmpty } from "@/lib/tasks/task-description";
import { acknowledgePersonalRequirementAction } from "@/app/(admin)/dashboard/aufgaben/personal-requirement-actions";

type Props = {
  view: PersonalRequirementExecutionView;
  locale: string;
  timeZone: string;
  backHref: string;
};

function formatDateTime(iso: string | null, locale: string, timeZone: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function PersonalRequirementExecutionWorkspace({
  view,
  locale,
  timeZone,
  backHref,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(view.recipient.resolutionStatus === "RESOLVED");

  const hasDescription = !storedTaskDescriptionIsEmpty(view.requirement.description);
  const subjectSuffix =
    view.actingForOtherPerson && view.subjectDisplayName.trim()
      ? ` für ${view.subjectDisplayName.trim()}`
      : "";

  const submit = useCallback(() => {
    if (isPending || completed || !view.canRespond) {
      return;
    }
    setErrorMessage(null);

    startTransition(async () => {
      const result = await acknowledgePersonalRequirementAction({
        personalActionId: view.personalActionId,
        requirementRecipientId: view.recipient.id,
      });

      if (result.ok) {
        setCompleted(true);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }, [completed, isPending, router, view]);

  const deadlineLabel =
    view.deadlinePresentation.kind !== "NONE" ? view.deadlinePresentation.label : null;

  return (
    <div
      className="flex min-h-0 flex-col"
      data-testid="personal-requirement-execution-workspace"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--primary)] hover:underline"
          data-testid="personal-requirement-back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Meine Aufgaben
        </Link>
        <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          Anforderung
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-lg font-semibold leading-snug text-[var(--foreground)] sm:text-xl">
              {view.requirement.title}
            </h1>
            <RequirementRecipientStatusLabel
              status={completed ? "COMPLETED" : view.managementStatus}
              className="shrink-0 text-[0.8125rem]"
            />
          </div>

          {view.actingForOtherPerson ? (
            <p className="text-[0.875rem] text-[var(--text-2)]">
              Empfänger: <span className="font-medium">{view.subjectDisplayName}</span>
            </p>
          ) : null}

          <dl className="grid gap-3 text-[0.8125rem] sm:grid-cols-2">
            {view.creatorLabel ? (
              <div>
                <dt className="text-[var(--muted-foreground)]">Erstellt von</dt>
                <dd className="font-medium text-[var(--foreground)]">{view.creatorLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[var(--muted-foreground)]">Erstellt am</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {formatDateTime(view.requirement.createdAt, locale, timeZone)}
              </dd>
            </div>
            {deadlineLabel ? (
              <div>
                <dt className="text-[var(--muted-foreground)]">Frist</dt>
                <dd
                  className={cn(
                    "font-medium",
                    view.deadlinePresentation.emphasis === "urgent"
                      ? "text-[var(--destructive)]"
                      : view.deadlinePresentation.emphasis === "attention"
                        ? "text-[var(--sce-warning)]"
                        : "text-[var(--foreground)]",
                  )}
                  data-testid="personal-requirement-deadline"
                >
                  {view.deadlinePresentation.kind === "OVERDUE"
                    ? `Überfällig · ${deadlineLabel.replace(/^Fällig · /, "")}`
                    : deadlineLabel}
                </dd>
              </div>
            ) : null}
            {view.requirement.status !== "ACTIVE" ? (
              <div>
                <dt className="text-[var(--muted-foreground)]">Status Anforderung</dt>
                <dd className="font-medium text-[var(--foreground)]">
                  {REQUIREMENT_STATUS_LABELS[view.requirement.status]}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {hasDescription ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Beschreibung
            </h2>
            <TaskDescriptionContent
              description={view.requirement.description}
              className="prose prose-sm max-w-none text-[var(--foreground)]"
              data-testid="personal-requirement-description"
            />
          </section>
        ) : null}

        {completed || view.recipient.resolutionStatus === "RESOLVED" ? (
          <section
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3"
            data-testid="personal-requirement-completed"
          >
            <p className="text-[0.875rem] font-medium text-emerald-800 dark:text-emerald-200">
              {view.responseLabel ?? "Bestätigt"}
              {view.respondedActingForLabel ? ` ${view.respondedActingForLabel}` : ""}
            </p>
            {view.recipient.respondedAt ? (
              <p className="mt-1 text-[0.8125rem] text-[var(--text-2)]">
                Erledigt am{" "}
                {formatDateTime(view.recipient.respondedAt, locale, timeZone)}
              </p>
            ) : null}
          </section>
        ) : (
          <section className="mt-auto flex flex-col gap-3 border-t border-[var(--border)] pt-5">
            <p className="text-[0.875rem] text-[var(--text-2)]">
              Bitte bestätige, dass du diese Anforderung zur Kenntnis genommen hast.
            </p>
            {view.respondBlockedMessage ? (
              <p
                className="text-[0.8125rem] text-[var(--muted-foreground)]"
                role="status"
                data-testid="personal-requirement-blocked"
              >
                {view.respondBlockedMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending || !view.canRespond}
                onClick={submit}
                className={cn(
                  "inline-flex min-h-[2.75rem] items-center justify-center rounded-md px-4 py-2 text-[0.875rem] font-medium transition-colors",
                  "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
                aria-label={`Als erledigt bestätigen${subjectSuffix}`}
                data-testid="personal-requirement-acknowledge"
              >
                {isPending ? "Wird gespeichert…" : "Als erledigt bestätigen"}
              </button>
            </div>
            {errorMessage ? (
              <p
                className="text-[0.8125rem] text-[var(--destructive)]"
                role="alert"
                data-testid="personal-requirement-error"
              >
                {errorMessage}
              </p>
            ) : null}
          </section>
        )}
      </div>
    </div>
  );
}
