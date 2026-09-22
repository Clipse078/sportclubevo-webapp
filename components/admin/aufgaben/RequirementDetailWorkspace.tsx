"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import type { RequirementAggregateDto, RequirementDto } from "@/lib/requirements/types";
import type { RequirementPersonOption } from "@/lib/requirements/person-search";
import type { RequirementRecipientMatrixRow } from "@/lib/requirements/management-service";
import {
  formatActingForLabel,
  formatRecipientResolutionLabel,
  formatRecipientResponseLabel,
  REQUIREMENT_STATUS_LABELS,
} from "@/lib/requirements/presentation";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import TaskDescriptionContent from "./TaskDescriptionContent";
import RequirementPersonMultiPicker from "./RequirementPersonMultiPicker";
import {
  activateRequirementAction,
  cancelRequirementAction,
  closeRequirementAction,
  updateRequirementDraftAction,
} from "@/app/(admin)/dashboard/aufgaben/requirement-actions";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";

type Props = {
  requirement: RequirementDto;
  aggregate: RequirementAggregateDto | null;
  audienceKnown: RequirementPersonOption[];
  matrixRows: RequirementRecipientMatrixRow[];
  matrixTotalCount: number;
  matrixPage: number;
  matrixPageCount: number;
  canManage: boolean;
  canViewMatrix: boolean;
  locale: string;
  timeZone: string;
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

export default function RequirementDetailWorkspace({
  requirement,
  aggregate,
  audienceKnown,
  matrixRows,
  matrixTotalCount,
  matrixPage,
  matrixPageCount,
  canManage,
  canViewMatrix,
  locale,
  timeZone,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [audienceIds, setAudienceIds] = useState(requirement.draftAudiencePersonIds);
  const [publishOpen, setPublishOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const matrixFilter = (searchParams.get("matrix") ?? "ALL").toUpperCase();
  const matrixSearch = searchParams.get("mq") ?? "";

  const isDraft = requirement.status === "DRAFT";
  const isActive = requirement.status === "ACTIVE";
  const readOnly = requirement.status === "CLOSED" || requirement.status === "CANCELLED";

  const backHref = buildAufgabenBereichHref("anforderungen");

  const matrixFilterHref = useMemo(() => {
    return (filter: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("matrix", filter);
      params.delete("mp");
      return `?${params.toString()}`;
    };
  }, [searchParams]);

  function onSaveDraft(formData: FormData) {
    setError(null);
    formData.set("audiencePersonIds", audienceIds.join(","));
    startTransition(async () => {
      const result = await updateRequirementDraftAction(requirement.id, formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function onPublish() {
    setError(null);
    startTransition(async () => {
      const formEl = document.getElementById("requirement-draft-form") as HTMLFormElement | null;
      if (formEl) {
        const formData = new FormData(formEl);
        formData.set("audiencePersonIds", audienceIds.join(","));
        const saveResult = await updateRequirementDraftAction(requirement.id, formData);
        if (!saveResult.ok) {
          setError(saveResult.message);
          return;
        }
      }
      const result = await activateRequirementAction(requirement.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPublishOpen(false);
      router.refresh();
    });
  }

  function onClose() {
    startTransition(async () => {
      const result = await closeRequirementAction(requirement.id);
      if (!result.ok) setError(result.message);
      else {
        setCloseOpen(false);
        router.refresh();
      }
    });
  }

  function onCancel() {
    startTransition(async () => {
      const result = await cancelRequirementAction(requirement.id);
      if (!result.ok) setError(result.message);
      else {
        setCancelOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6" data-testid="requirement-detail-workspace">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-2)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Anforderungen
        </Link>
        <span className="inline-flex rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
          {REQUIREMENT_STATUS_LABELS[requirement.status]}
        </span>
      </div>

      <header className="space-y-2 border-b border-[var(--border)] pb-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{requirement.title}</h1>
        <p className="text-sm text-[var(--text-2)]">
          Fällig{" "}
          {requirement.dueAt
            ? formatDateTime(requirement.dueAt, locale, timeZone).split(",")[0]
            : "—"}
          {requirement.activatedAt ? (
            <span className="ml-3 text-[var(--muted)]">
              Veröffentlicht {formatDateTime(requirement.activatedAt, locale, timeZone)}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-[var(--muted)]">
          Antwort: <span className="text-[var(--text-2)]">Bestätigung</span>
        </p>
      </header>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {isDraft ? (
        <form id="requirement-draft-form" action={onSaveDraft} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
            <input
              name="title"
              required
              defaultValue={requirement.title}
              disabled={!canManage || pending}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              data-testid="requirement-draft-title"
            />
          </label>
          <TaskDescriptionFormField
            name="description"
            initialStored={requirement.description}
            disabled={!canManage || pending}
            compact
          />
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Fällig am</span>
            <input
              type="date"
              name="dueAt"
              defaultValue={requirement.dueAt?.slice(0, 10) ?? ""}
              disabled={!canManage || pending}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            />
          </label>
          <RequirementPersonMultiPicker
            selectedIds={audienceIds}
            onSelectedIdsChange={setAudienceIds}
            disabled={!canManage || pending}
            initialKnown={audienceKnown}
          />
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="fca-button-secondary text-sm" disabled={pending}>
                Speichern
              </button>
              <button
                type="button"
                className="fca-button-primary text-sm"
                disabled={pending || audienceIds.length === 0}
                onClick={() => setPublishOpen(true)}
                data-testid="requirement-publish-open"
              >
                Veröffentlichen
              </button>
            </div>
          ) : null}
          <p className="text-xs text-[var(--muted)]">
            {audienceIds.length === 1
              ? "1 Person ausgewählt"
              : `${audienceIds.length} Personen ausgewählt`}
          </p>
        </form>
      ) : (
        <>
          {requirement.description ? (
            <section className="prose prose-sm max-w-none text-[var(--foreground)]">
              <TaskDescriptionContent description={requirement.description} />
            </section>
          ) : null}

          {aggregate ? (
            <section
              className="rounded-lg border border-[var(--border)]/80 px-4 py-3"
              data-testid="requirement-progress-block"
            >
              <p className="text-sm font-medium text-[var(--foreground)]">
                {aggregate.resolvedCount} von {aggregate.totalRecipients} bestätigt
                <span className="ml-2 text-[var(--muted)]">{aggregate.resolvedPercent} %</span>
              </p>
              <p className="mt-1 text-sm text-[var(--text-2)]">{aggregate.openCount} offen</p>
              <div
                className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-[var(--surface-2)]"
                role="progressbar"
                aria-valuenow={aggregate.resolvedPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${aggregate.resolvedPercent}%` }}
                />
              </div>
            </section>
          ) : null}

          {canManage && isActive ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="fca-button-secondary text-sm"
                onClick={() => setCloseOpen(true)}
                data-testid="requirement-close-open"
              >
                Abschliessen
              </button>
              <button
                type="button"
                className="text-sm text-[var(--text-2)] underline-offset-2 hover:underline"
                onClick={() => setCancelOpen(true)}
                data-testid="requirement-cancel-open"
              >
                Abbrechen
              </button>
            </div>
          ) : null}
        </>
      )}

      {canViewMatrix && !isDraft ? (
        <section className="space-y-3" data-testid="requirement-recipient-matrix">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Empfänger</h2>
            <div className="flex flex-wrap gap-1 text-xs">
              {[
                ["ALL", "Alle"],
                ["OPEN", "Offen"],
                ["ACKNOWLEDGED", "Bestätigt"],
                ["OVERDUE", "Überfällig"],
              ].map(([id, label]) => (
                <Link
                  key={id}
                  href={matrixFilterHref(id)}
                  className={
                    matrixFilter === id
                      ? "rounded-md bg-[var(--surface-2)] px-2 py-1 font-medium"
                      : "rounded-md px-2 py-1 text-[var(--text-2)] hover:bg-[var(--surface-2)]/60"
                  }
                  data-testid={`requirement-matrix-filter-${id.toLowerCase()}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <input
            type="search"
            defaultValue={matrixSearch}
            placeholder="Person suchen…"
            className="w-full max-w-sm rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
            data-testid="requirement-matrix-search"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const params = new URLSearchParams(searchParams.toString());
                params.set("mq", (e.target as HTMLInputElement).value.trim());
                params.delete("mp");
                router.push(`?${params.toString()}`);
              }
            }}
          />
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/40 text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Antwort</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Zeitpunkt</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Handelt für</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                      {matrixFilter === "OPEN" ? "Alle haben bestätigt" : "Keine Personen gefunden"}
                    </td>
                  </tr>
                ) : (
                  matrixRows.map((row) => {
                    const actingFor = formatActingForLabel({
                      subjectPersonId: row.subjectPersonId,
                      responseActorPersonId: row.responseActorPersonId,
                      subjectDisplayName: row.subjectDisplayName,
                      actorDisplayName: row.actorDisplayName,
                    });
                    return (
                      <tr key={row.id} className="border-b border-[var(--border)]/70 last:border-0">
                        <td className="px-3 py-2">{row.subjectDisplayName}</td>
                        <td className="px-3 py-2">
                          {formatRecipientResolutionLabel(row.resolutionStatus)}
                          {row.isOverdue ? (
                            <span className="ml-2 text-xs text-amber-700">Überfällig</span>
                          ) : null}
                        </td>
                        <td className="hidden px-3 py-2 sm:table-cell">
                          {formatRecipientResponseLabel(row.responseValue)}
                        </td>
                        <td className="hidden px-3 py-2 md:table-cell">
                          {formatDateTime(row.respondedAt, locale, timeZone)}
                        </td>
                        <td className="hidden px-3 py-2 lg:table-cell">{actingFor ?? "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {matrixPageCount > 1 ? (
            <p className="text-xs text-[var(--muted)]">
              Seite {matrixPage} / {matrixPageCount} ({matrixTotalCount} Empfänger)
            </p>
          ) : null}
        </section>
      ) : null}

      {publishOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
            data-testid="requirement-publish-dialog"
          >
            <h2 className="text-base font-semibold">Anforderung veröffentlichen?</h2>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              {audienceIds.length} Personen werden als Empfänger übernommen. Die Empfängerliste kann
              danach nicht mehr direkt geändert werden.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="fca-button-secondary text-sm" onClick={() => setPublishOpen(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="fca-button-primary text-sm"
                onClick={onPublish}
                disabled={pending}
                data-testid="requirement-publish-confirm"
              >
                Veröffentlichen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {closeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border bg-[var(--surface)] p-4">
            <h2 className="text-base font-semibold">Anforderung abschliessen?</h2>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Offene Rückmeldungen bleiben als offen dokumentiert. Danach sind keine weiteren
              Bestätigungen möglich.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="fca-button-secondary text-sm" onClick={() => setCloseOpen(false)}>
                Abbrechen
              </button>
              <button type="button" className="fca-button-primary text-sm" onClick={onClose} disabled={pending}>
                Abschliessen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border bg-[var(--surface)] p-4">
            <h2 className="text-base font-semibold">Anforderung abbrechen?</h2>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Die Anforderung wird beendet. Bereits erfolgte Bestätigungen bleiben dokumentiert.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="fca-button-secondary text-sm" onClick={() => setCancelOpen(false)}>
                Zurück
              </button>
              <button type="button" className="fca-button-primary text-sm" onClick={onCancel} disabled={pending}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {readOnly ? (
        <p className="text-xs text-[var(--muted)]">
          Diese Anforderung ist abgeschlossen — keine weiteren Änderungen möglich.
        </p>
      ) : null}
    </div>
  );
}
