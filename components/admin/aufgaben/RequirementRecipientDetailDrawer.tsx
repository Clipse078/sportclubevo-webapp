"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { RequirementRecipientMatrixRow } from "@/lib/requirements/management-service";
import RequirementRecipientStatusLabel from "./RequirementRecipientStatusLabel";
import {
  formatActingForLabel,
  formatRecipientResponseLabel,
} from "@/lib/requirements/presentation";
import { formatRequirementResponderLabel } from "@/lib/requirements/recipient-progress-presentation";

type Props = {
  row: RequirementRecipientMatrixRow;
  requirementTitle: string;
  locale: string;
  timeZone: string;
  onClose: () => void;
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

function formatDueDate(iso: string | null, locale: string, timeZone: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export default function RequirementRecipientDetailDrawer({
  row,
  requirementTitle,
  locale,
  timeZone,
  onClose,
}: Props) {
  const actingFor = formatActingForLabel({
    subjectPersonId: row.subjectPersonId,
    responseActorPersonId: row.responseActorPersonId,
    subjectDisplayName: row.subjectDisplayName,
    actorDisplayName: row.actorDisplayName,
  });
  const responderLabel = formatRequirementResponderLabel(row.actorDisplayName);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" data-testid="requirement-recipient-drawer">
      <button type="button" className="flex-1" aria-label="Schliessen" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="requirement-recipient-drawer-title"
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <p className="text-xs text-[var(--muted)]">{requirementTitle}</p>
            <h2 id="requirement-recipient-drawer-title" className="text-base font-semibold text-[var(--foreground)]">
              {row.subjectDisplayName}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
            onClick={onClose}
            aria-label="Detail schliessen"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <dl className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Status</dt>
            <dd className="mt-1">
              <RequirementRecipientStatusLabel status={row.managementStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Fällig</dt>
            <dd className="mt-1 text-[var(--text-2)]">{formatDueDate(row.dueAt, locale, timeZone)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Erledigt am</dt>
            <dd className="mt-1 text-[var(--text-2)]">
              {formatDateTime(row.respondedAt, locale, timeZone)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Antwort</dt>
            <dd className="mt-1 text-[var(--text-2)]">{formatRecipientResponseLabel(row.responseValue)}</dd>
          </div>
          {responderLabel ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Beantwortet von
              </dt>
              <dd className="mt-1 text-[var(--text-2)]">{responderLabel.replace(/^Beantwortet von /, "")}</dd>
            </div>
          ) : actingFor ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Handelt für</dt>
              <dd className="mt-1 text-[var(--text-2)]">{actingFor}</dd>
            </div>
          ) : null}
        </dl>
        <div className="border-t border-[var(--border)] px-4 py-3">
          <Link
            href={`/dashboard/persons/${row.subjectPersonId}`}
            className="fca-button-secondary inline-flex text-sm"
            data-testid="requirement-recipient-open-person"
          >
            Person öffnen
          </Link>
        </div>
      </aside>
    </div>
  );
}
