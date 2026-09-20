"use client";

import Link from "next/link";
import { TASK_CONTEXT_LABELS } from "@/lib/tasks/management-labels";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";

type AssigneeOption = { userId: string; label: string };

type Props = {
  resetHref: string;
  statusValue: string;
  assigneeValue: string | undefined;
  priorityValue: string | undefined;
  deadlineValue: string;
  recurringValue: string;
  contextValue: string | undefined;
  showAssigneeFilter?: boolean;
  assigneeOptions: AssigneeOption[];
  statusHrefByValue: Record<string, string>;
  assigneeHrefByValue: Record<string, string>;
  priorityHrefByValue: Record<string, string>;
  deadlineHrefByValue: Record<string, string>;
  recurringHrefByValue: Record<string, string>;
  contextHrefByValue: Record<string, string>;
};

function navigate(href: string) {
  if (typeof window !== "undefined") window.location.assign(href);
}

export default function AufgabenManagementFilterRail({
  resetHref,
  statusValue,
  assigneeValue,
  priorityValue,
  deadlineValue,
  recurringValue,
  contextValue,
  showAssigneeFilter = true,
  assigneeOptions,
  statusHrefByValue,
  assigneeHrefByValue,
  priorityHrefByValue,
  deadlineHrefByValue,
  recurringHrefByValue,
  contextHrefByValue,
}: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 sm:col-span-2 min-[105rem]:col-span-1"
      aria-label="Filter"
      data-testid="aufgaben-filter-rail"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Filter</h3>
        <Link
          href={resetHref}
          className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
          data-testid="aufgaben-filter-reset"
        >
          Zurücksetzen
        </Link>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Status
          </span>
          <select
            className="fca-input w-full text-sm"
            value={statusValue}
            onChange={(e) => navigate(statusHrefByValue[e.target.value] ?? statusHrefByValue.ACTIVE!)}
            aria-label="Status filtern"
            data-testid="aufgaben-status-filter"
          >
            <option value="ACTIVE">Aktiv (Offen / In Bearbeitung)</option>
            <option value="OPEN">Offen</option>
            <option value="IN_PROGRESS">In Bearbeitung</option>
            <option value="DONE">Erledigt</option>
            <option value="CANCELLED">Abgebrochen</option>
          </select>
        </label>

        {showAssigneeFilter ? (
          <label className="block space-y-1">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Verantwortlich
            </span>
            <select
              className="fca-input w-full text-sm"
              value={assigneeValue ?? ""}
              onChange={(e) =>
                navigate(assigneeHrefByValue[e.target.value] ?? assigneeHrefByValue[""]!)
              }
              aria-label="Verantwortliche Person filtern"
              data-testid="aufgaben-assignee-filter"
            >
              <option value="">Alle</option>
              {assigneeOptions.map((option) => (
                <option key={option.userId} value={option.userId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Priorität
          </span>
          <select
            className="fca-input w-full text-sm"
            value={priorityValue ?? ""}
            onChange={(e) =>
              navigate(priorityHrefByValue[e.target.value] ?? priorityHrefByValue[""]!)
            }
            aria-label="Priorität filtern"
            data-testid="aufgaben-priority-filter"
          >
            <option value="">Alle</option>
            {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((key) => (
              <option key={key} value={key}>
                {TASK_PRIORITY_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Termin
          </span>
          <select
            className="fca-input w-full text-sm"
            value={deadlineValue}
            onChange={(e) =>
              navigate(deadlineHrefByValue[e.target.value] ?? deadlineHrefByValue.ALL!)
            }
            aria-label="Termin filtern"
            data-testid="aufgaben-deadline-filter"
          >
            <option value="ALL">Alle Termine</option>
            <option value="OVERDUE">Überfällig</option>
            <option value="THIS_WEEK">Diese Woche</option>
            <option value="NO_DEADLINE">Ohne Termin</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Wiederholung
          </span>
          <select
            className="fca-input w-full text-sm"
            value={recurringValue}
            onChange={(e) =>
              navigate(recurringHrefByValue[e.target.value] ?? recurringHrefByValue.ALL!)
            }
            aria-label="Wiederkehrend filtern"
            data-testid="aufgaben-recurring-filter"
          >
            <option value="ALL">Alle Aufgaben</option>
            <option value="RECURRING">Wiederkehrend</option>
            <option value="SINGLE">Einmalig</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Kontext
          </span>
          <select
            className="fca-input w-full text-sm"
            value={contextValue ?? ""}
            onChange={(e) =>
              navigate(contextHrefByValue[e.target.value] ?? contextHrefByValue[""]!)
            }
            aria-label="Kontext filtern"
            data-testid="aufgaben-context-filter"
          >
            <option value="">Alle Kontexte</option>
            {Object.entries(TASK_CONTEXT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
